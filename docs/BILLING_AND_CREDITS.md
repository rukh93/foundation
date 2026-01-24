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
7. **Only JobBurn counts as credit usage**
8. Cached balances are **derived**, ledger is authoritative

---

## 2) Plans & subscriptions

### 2.1 Plans

| Plan | Price | Monthly credits |
|------|-------|-----------------|
| Free | $0 | 40 |
| Coach | $29 | 120 |
| Club | $99 | 1000 |
| Custom | negotiated | custom |

**Rules**
- `plan.code` is stable and unique (`free_org`, `coach`, `club`)
- Prices and credits change via **versions**
- Plans can be disabled without redeploy
- **Free plan always exists**
- **Free plan does not roll over credits**

---

### 2.2 Plan versioning

We store:
- `Plan` → stable identity
- `PlanVersion` → mutable values:
    - monthly credits
    - daily credit policy
    - effective dates

Guarantees:
- historical correctness
- safe upgrades
- no retroactive changes

---

## 3) Credit types (buckets)

### 3.1 Subscription credits
- Granted per credit cycle
- Stored in `subscriptionCredits`
- Granted via ledger entries
- **No rollover**
- Reset implicitly by advancing the schedule

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

```prisma
enum CreditLedgerReason {
  DailyGrant
  SubscriptionGrant
  SubscriptionReset
  CreditPackPurchase
  CreditPackRefund
  JobBurn
  ManualAdjustment
  PlanUpgradeAdjustment
  PlanDowngradeClamp
}
```

**Rules**
- **Only `JobBurn` entries count as usage**
- Grants, resets, clamps, adjustments ≠ usage
- Ledger is the single source of truth

### 4.2 Cached balance
**OrganizationCreditBalance:**
* Performance cache only
* Updated together with ledger
* Rebuildable from ledger at any time

---

## 5) Monthly credits — final logic

### 5.1 Credit schedule
Each organization has one row: **OrganizationCreditSchedule**
**Fields:**
* `subscriptionAnchorAt`
* `lastSubscriptionGrantAt`
* `nextSubscriptionGrantAt`

*This is the only clock for monthly credits.*

### 5.2 Grant execution paths

**A) Scheduler (normal)**
* Cloud Run Job (every ~30 minutes)
* Selects orgs where:
    * `nextSubscriptionGrantAt <= now`
    * Subscription is **Active**
    * Entitlement valid
* Publishes `CREDITS_MONTHLY_GRANT`

**B) Subscription webhook (immediate)**
* Triggered when: subscription created, payment recovered, plan upgraded, or subscription re-activated.
* Webhook tries catch-up grants immediately.
* Scheduler acts as the safety net.

### 5.3 Idempotency
Monthly grant key: `SUB_GRANT:{organizationId}:{cycleStartISO}`
**Prevents:**
* Double webhook delivery
* Pub/Sub retries
* Scheduler/webhook overlap

### 5.4 Entitlement rules
A subscription is entitled if:
* `periodEnd == null` → unlimited
* `periodEnd <= 0` → unlimited
* Otherwise → `now < periodEnd`
* *Note: Handles negative sentinel values safely.*

---

## 6) Clerk subscription webhooks

### 6.1 Responsibility split
* **Clerk** → Subscription state
* **DB** → Credit accounting
* *Clerk never grants credits directly.*

### 6.2 Effective subscription item
From webhook payload items:
* `period_start <= now < period_end`
* Upcoming items are ignored
* Canceled items still count until period end

### 6.3 Webhook flow
1. Store webhook event (idempotent)
2. Resolve current item
3. Upsert `OrganizationSubscription`
4. Ensure balance + schedule
5. Grant initial or catch-up credits
6. Apply upgrade / downgrade logic
7. Mark webhook processed

---

## 7) Upgrades & downgrades

### 7.1 Upgrade (Free → Coach, Coach → Club)
**Rules:** Mid-cycle upgrade; Only actual usage counts.
**Logic:**
1. Sum `JobBurn` usage in cycle
2. `targetRemaining = newPlanCredits - used`
3. Grant delta only
4. Ledger entry: `PlanUpgradeAdjustment`

**Result:** Free → Coach gives full 120 if unused. Partial usage is respected; No double counting.

### 7.2 Downgrade / cancel → Free
**Rules:** No rollover; Clamp prevents abuse.
**Logic:**
1. Resolve Free allocation
2. Subtract `JobBurn` usage
3. Clamp balance if above allowed
4. Ledger entry: `PlanDowngradeClamp`

---

## 8) Credit burn order
When a job runs:
1.  **Daily credits**
2.  **Subscription credits**
3.  **Purchased credits**

**Burn entries:**
* Negative delta
* `JobBurn` reason
* `jobId` + `featureKey`
* *Credits burn after successful execution only.*

---

## 9) Async generation flow
1. **Client** → `POST /generation`
2. **API** validates org + credits
3. **Job** created (`Queued`)
4. **Pub/Sub** message published
5. **Worker** runs job
6. **Cost** calculated
7. **Burn ledger entries** written
8. **Job** marked `Succeeded` / `Failed`

---

## 10) Daily credits
* Separate scheduler runs at `00:00 UTC`
* Enforces monthly cap
* Fully idempotent

---

## 11) Stripe credit packs
**On purchase:**
* Identify organization
* Resolve pack version
* Ledger entry: `CreditPackPurchase`
* Update cached balance
* **Refunds:** Negative ledger entry

---

## 12) Admin panel
**Required screens:**
* **Subscription:** Plan, status, renewal
* **Balances:** Daily / Subscription / Purchased
* **Ledger history:** Audit log

---

## 13) Guarantees
* No double grants / Safe retries
* Scheduler downtime safe
* Correct upgrade math
* Downgrade abuse prevented
* Fully auditable
* Horizontally scalable