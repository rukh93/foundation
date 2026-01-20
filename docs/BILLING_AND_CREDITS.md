# Billing + Credits System
**(Clerk Billing + Stripe Packs, Organization-first, Scheduler-driven)**

This system is **subscription-based** and **credit-metered**, built around **Organizations**, not users.

**Billing providers**
- **Clerk Billing** → subscriptions (Free / Coach / Club / Pro / Custom)
- **Stripe (direct)** → one-off purchases for credit packs

**Infrastructure**
- Frontend: **Next.js (Vercel)**
- API: **NestJS (Google Cloud Run)**
- Async & scheduling: **Google Pub/Sub + Cloud Run Workers / Jobs**

---

## 1) Core principles

1. Clerk is the **source of truth for subscription state**
2. Database is the **source of truth for credits**
3. Credits are **never inferred**, only written via ledger entries
4. All grant/burn operations are **idempotent**
5. Monthly credits are driven by a **schedule**, not Clerk renewals
6. Webhooks and scheduler **cooperate**, never conflict

---

## 2) Plans & subscriptions

### 2.1 Plans

Example plans (configurable):

| Plan | Price | Monthly credits |
|-----|------|-----------------|
| Free | $0 | 40 |
| Coach | $29 | 120 |
| Club | $99 | 1000 |
| Custom | negotiated | custom |

**Rules**
- `plan.code` is stable and unique (`free_org`, `coach`, `club`)
- Prices and credits change via **versions**
- Plans can be disabled without redeploy

---

### 2.2 Plan versioning

We store:
- `Plan` → stable identity
- `PlanVersion` → mutable values:
    - monthly credits
    - daily credit policy
    - effective dates

This guarantees:
- historical correctness
- safe upgrades
- no retroactive changes

---

## 3) Credit types (buckets)

Credits are split into **independent buckets**:

### 3.1 Subscription credits
- Granted per credit cycle
- Stored in `subscriptionCredits`
- Granted via ledger entries
- Optional rollover (future)

### 3.2 Daily credits
- Granted by daily scheduler
- Do not roll over day-to-day
- Monthly cap enforced
- Configurable per plan

### 3.3 Purchased credits
- Bought via Stripe
- Never expire by default
- Always consumed last

---

## 4) Ledger-based accounting

### 4.1 Credit ledger

All changes are written to `CreditLedgerEntry`:
- grants
- burns
- upgrades
- refunds
- manual adjustments

Ledger provides:
- auditability
- retry safety
- idempotency
- historical accuracy

### 4.2 Cached balance

`OrganizationCreditBalance` is a performance cache:
- Updated together with ledger
- Can always be rebuilt from ledger
- Never trusted alone

---

## 5) Monthly credits — final logic

### 5.1 Credit schedule

Each organization has one row:

`OrganizationCreditSchedule`

Fields:
- `subscriptionAnchorAt`
- `lastSubscriptionGrantAt`
- `nextSubscriptionGrantAt`

This is the **only clock** for monthly credits.

---

### 5.2 Grant execution paths

Monthly credits can be granted via **two paths**:

#### A) Scheduler (normal case)
- Cloud Run Job
- Selects orgs where:
    - `nextSubscriptionGrantAt <= now`
    - subscription is `Active`
- Publishes `CREDITS_MONTHLY_GRANT`
- Worker grants credits (idempotent, catch-up capable)

#### B) Subscription webhook (immediate)
Triggered when:
- subscription becomes active
- payment recovered
- plan upgraded/downgraded
- subscription created

Handler immediately attempts **catch-up grants** so credits update instantly.

Scheduler remains the safety net.

---

### 5.3 Idempotency

Each monthly grant uses:

`SUB_GRANT:{organizationId}:{cycleStartISO}`

This prevents:
- double webhook delivery
- Pub/Sub retries
- scheduler + webhook overlap

---

### 5.4 PastDue handling

- `PastDue` → **no monthly grants**
- When status becomes `Active`:
    - missed cycles are granted (bounded, e.g. max 12)

---

## 6) Clerk subscription webhooks

### 6.1 Responsibility split

- Clerk → subscription state
- DB → credit accounting

Clerk never grants credits.

---

### 6.2 Effective subscription item

Webhook payloads may contain multiple items:
- active
- canceled (still active until period end)
- upcoming
- ended

We select the **current item**:

``` period_start <= now < period_end ```

Upcoming items are **not** treated as current.

---

### 6.3 Webhook flow

On `subscription.created` / `subscription.updated`:

1. Store webhook event (idempotent)
2. Resolve current item
3. Upsert `OrganizationSubscription`
4. Ensure balance + schedule exist
5. Grant initial or catch-up monthly credits
6. Apply upgrade adjustment if needed
7. Mark webhook processed

---

## 7) Upgrades & downgrades

### 7.1 Upgrade (Coach → Club)

Rules:
- Happens mid-cycle
- User may have already spent credits

Logic:
1. Calculate credits already used in cycle
2. Compute `targetRemaining = newPlanAlloc - used`
3. Grant only the delta
4. Insert `PlanUpgradeAdjustment` ledger entry
5. Update cached balance

Idempotent by webhook event id.

---

### 7.2 Downgrade / cancel

- No immediate clawback
- Next cycle naturally reflects lower plan
- Cancel still allows usage until period end

---

## 8) Credit burn order

When a job runs:
1. Daily credits
2. Subscription credits
3. Purchased credits

Each burn is a ledger entry with:
- negative delta
- jobId
- featureKey
- reason

---

## 9) Async generation flow

1. Client → `POST /generation`
2. API:
    - validates org & membership
    - checks credits
    - creates job (`Queued`)
3. API publishes Pub/Sub
4. Worker runs job
5. Worker calculates cost
6. Worker writes burn ledger entries
7. Job marked `Succeeded` / `Failed`

Credits are burned **after success**.

---

## 10) Daily credits

- Separate scheduler
- Runs at midnight UTC
- Per org:
    - check monthly cap
    - grant daily amount if allowed
- Fully idempotent

---

## 11) Stripe credit packs

On successful payment:
1. Identify organization
2. Resolve pack version
3. Insert `PurchasePack` ledger entry
4. Update cached balance

Refunds → negative ledger entry.

---

## 12) Admin panel (org admins)

### Required screens

1. Subscription
    - plan
    - status
    - renewal info

2. Balances
    - daily
    - subscription
    - purchased
    - total

3. Ledger history
    - timestamp
    - bucket
    - delta
    - reason
    - job / purchase reference

---

## 13) Guarantees

- No double grants
- Safe retries
- Scheduler downtime safe
- Correct upgrade math
- No reliance on Clerk renewals
- Fully auditable
- Scales cleanly

---

## 14) Configurable without deploy

- Plans & plan versions
- Monthly credits
- Daily credit policy
- Burn rates
- Credit packs
- Rollover policy (future)

---

## Final note

Clerk answers **“who is subscribed?”**  
Your system answers **“who gets credits, when, and how many?”**

That separation is what makes the system reliable and scalable.
