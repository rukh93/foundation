# Billing + Credits System (Clerk Billing + Stripe Packs) — Organization-first

This project is **subscription-based** and **credit-metered**, using:

- **Clerk Billing** → subscriptions (Free / Coach / Pro / Custom)
- **Stripe (direct)** → one-off purchases for **credit packs**
- **All billing + credits are tracked per Organization** (we use Clerk Organizations, not user-level subscriptions)

Frontend:

- Next.js on Vercel

Backend:

- NestJS API on Google Cloud Run

Async processing:

- Google Pub/Sub → NestJS Worker on Cloud Run

---

## 1) Business rules

### 1.1 Plans (subscriptions)

We have 3 default plans (examples):

- **Free**: $0, monthly credits = 40, daily credits enabled (configurable)
- **Coach**: $29 (or updated later), monthly credits = 120, daily credits enabled (configurable)
- **Pro**: $99 (or updated later), monthly credits = 1000, daily credits enabled (configurable)

Custom plans:

- **Academy**, **Federation** (custom pricing + custom credits)
- Custom billing cycles supported: **monthly / quarterly / annually**
- Standard plans supported billing cycles: **monthly / annually** (can be expanded later if needed)

**Important:**

- Plan `name` is unique and stable (e.g. `free`, `coach`, `pro`, `academy`, `federation`)
- Plan `code` is also unique and stable (same idea as name, used in code)
- **Prices and credit amounts can change over time** (we store versions)
- Plans can be **added/removed/disabled** without redeploying

### 1.2 Credit types

We track credits as separate “buckets”, because behavior differs:

1. **Monthly allocation credits** (from subscription)

- Renew each billing period
- Can optionally roll over (configurable per plan)

2. **Daily credits**

- Granted daily at midnight UTC (or your chosen policy)
- Do **not** roll over day-to-day
- Have a **monthly cap** (example: Free has 5/day up to 30/month, Paid has 5/day up to 150/month)
- Daily behavior can be changed/disabled per plan

3. **Purchased credits**

- Bought via Stripe credit packs
- Do not expire by default (configurable)
- Always tracked separately in the ledger

### 1.3 Credit packs (one-off purchases)

Stripe-only (not Clerk), because packs are not subscriptions.

Initial examples (all configurable from DB):

- Match Pack: $9 → 50 credits
- Season Pack: $19 → 150 credits
- Tournament Pack: $49 → 500 credits

Packs can be:

- updated (price/credits)
- disabled
- extended with new packs

### 1.4 Burn rates (feature costs)

Each AI feature has a burn multiplier (configurable from DB):

- Session Generation: 1.0
- Set Piece Design: 1.0
- Tactical Reconstructor (Vision): 1.0
- Tactical Playbook: 2.0
- Post-Match Diagnosis: 1.5
- AI Assessment / Audit: 10.0
- PDF Export: 1.0

Burn rates can be:

- updated
- disabled
- extended

---

## 2) Architecture: request → async job → credits burn

### 2.1 High-level flow

1. Client (Next.js) calls API: `POST /generation`
2. API validates org membership + checks credits availability
3. API creates a `GenerationJob` with status `Queued`
4. API publishes message to **Google Pub/Sub**
5. Worker consumes Pub/Sub and performs generation
6. Worker writes results + final cost and marks job `Succeeded` / `Failed`
7. Credits are deducted via **ledger entries**
8. Admin panel reads balances + ledger history (admins only)

---

## 3) Data model overview (organization-first)

### 3.1 Organizations and memberships

- `Organization` maps to Clerk Organization (`clerkOrgId`)
- `OrganizationMembership` maps to Clerk Org membership (`clerkOrgMemId`)
- Only org admins can access billing/ledger views in admin panel

### 3.2 Plans and versioning

We store:

- `Plan` (stable identity: name/code, active flag)
- `PlanVersion` (mutable values like price and included credits over time)

This supports:

- changing price/credits without changing plan identity
- historical correctness (old subscriptions can still reference the version active at that time)

### 3.3 Organization subscriptions (Clerk Billing)

We store:

- `OrganizationSubscription` record per org
- References to Clerk subscription ids + period
- Snapshotted link to `PlanVersion` at the moment subscription starts/changes

Clerk is the “source of truth” for subscription status.
DB is the “source of truth” for credit accounting + history.

### 3.4 Credits are tracked via a ledger

We use a **ledger** (`CreditLedgerEntry`) so we can:

- show history in admin panel
- audit deductions and grants
- handle refunds, adjustments, backfills

Balances can be computed from ledger, but for performance we also keep a cached aggregate:

- `OrganizationCreditBalance`

---

## 4) Credit computation rules

### 4.1 When checking available credits

To decide if a job can start, we check available credits in this order (recommended):

1. Daily credits remaining (if enabled)
2. Monthly subscription credits remaining
3. Purchased credits remaining

This ordering is configurable, but keep it stable to avoid user confusion.

### 4.2 Deductions

When a job finishes (or before starting, depending on your policy), we insert ledger entries:

- `BurnDaily` (if daily credits used)
- `BurnMonthly`
- `BurnPurchased`

Always store:

- `jobId`
- `featureKey`
- `costUnits`
- `burnRateSnapshot`
- `planVersionSnapshot` (optional but useful)

### 4.3 Daily credits

Daily credits:

- reset each day at midnight UTC (or cron)
- do not roll over
- are limited by monthly cap
- example policy:
  - Free: +5/day, cap 30/month
  - Paid: +5/day, cap 150/month

Implementation:

- A scheduled job grants daily credits by inserting `GrantDaily` ledger entries.
- The cap is enforced by checking sum of `GrantDaily` for the current calendar month.

Daily behavior can be updated/removed via DB configuration in `PlanVersion`.

### 4.4 Monthly credits

At subscription start or renewal:

- insert `GrantMonthly` ledger entry for included credits
- optionally roll over unused monthly credits based on plan policy:
  - if enabled: insert `GrantRollover` entry (computed from last period)
  - if disabled: unused simply disappears (no ledger entry needed)

### 4.5 Purchased credits

When Stripe payment succeeds:

- insert `PurchasePack` ledger entry (grant purchased credits)

Refunds:

- insert `RefundPack` (negative credits) or `Adjustment` as needed

---

## 5) Webhooks (source of truth boundaries)

### 5.1 Clerk Billing webhook events (subscriptions)

You should handle events like:

- subscription created/activated
- plan changed
- renewal happened
- canceled / past_due / unpaid

On webhook:

1. Identify Organization by `clerkOrgId`
2. Resolve plan by `plan.code` (or metadata mapping)
3. Resolve current active `PlanVersion` by date
4. Upsert `OrganizationSubscription`
5. If period boundary/renewal:
   - insert `GrantMonthly` (and rollover if enabled)
6. Recompute cached `OrganizationCreditBalance`

### 5.2 Stripe webhooks (credit packs)

Handle:

- `payment_intent.succeeded` (or checkout session completed)
- optionally `charge.refunded`

On success:

1. Identify Organization from Stripe metadata (store `clerkOrgId` or internal `organizationId`)
2. Resolve `CreditPackVersion`
3. Create `OrganizationCreditPurchase`
4. Insert `PurchasePack` ledger entry with granted credits
5. Recompute cached balances

---

## 6) Admin panel requirements (org admin only)

### 6.1 Who can see billing/credits

Only members with:

- `OrganizationMembership.role = Admin`

### 6.2 Screens (minimum)

1. Current subscription

- plan name
- billing period (monthly/annual/quarterly)
- status (active/canceled/past_due)
- next renewal date

2. Credit balances

- daily remaining
- monthly remaining
- purchased remaining
- total remaining

3. Credit ledger history (auditable)
   Columns:

- timestamp
- entry type (grant/burn/purchase/adjustment)
- amount (+/-)
- bucket (daily/monthly/purchased)
- reason / featureKey
- related jobId / purchaseId
- created by (system/admin)

---

## 7) Operational notes

### 7.1 API credit checks

API must:

- confirm request is under an Organization
- confirm user is a member
- confirm org has enough credits
- create job + publish Pub/Sub message
- return immediately with `Queued` status

### 7.2 Worker credit deduction timing

Two safe options:
A) **Deduct after success** (recommended for user trust)

- If job fails: no burn (or small burn if you want)

B) **Reserve then reconcile**

- Reserve estimated cost on enqueue
- Finalize on completion (adjust up/down)

This doc assumes A (deduct on completion), but schema supports both.

### 7.3 Consistency and idempotency

All webhooks must be idempotent:

- use unique external ids (`clerkSubscriptionId`, `stripePaymentIntentId`, etc.)
- do not grant credits twice

---

## 8) User scenarios (end-to-end)

### Scenario 1 — New org chooses Free plan

1. Client opens website → Pricing page
2. Clicks **Free**
3. Clerk creates org + subscription (or marks it free-tier)
4. Webhook stores `OrganizationSubscription`
5. System inserts:
   - monthly grant (40 credits) if free includes monthly allocation
   - daily credits will be granted by daily scheduler
6. Admin panel shows balances and “Free” status

### Scenario 2 — Org upgrades from Free → Coach monthly

1. Org admin opens Billing settings
2. Clicks **Upgrade to Coach**
3. Clerk Billing charges via Stripe (subscription)
4. Webhook updates `OrganizationSubscription` and points to new `PlanVersion`
5. System grants monthly credits per Coach policy
6. Credits remaining update immediately in admin panel

### Scenario 3 — Org generates a feature (async job)

1. User opens app and clicks “Generate Tactical Playbook”
2. Next.js calls API `POST /generation` with `featureKey=tactical_playbook`
3. API checks available credits (daily → monthly → purchased)
4. API creates `GenerationJob(status=Queued)` and publishes Pub/Sub
5. Worker runs generation and calculates final cost:
   - base units \* burn rate (e.g. 2.0)
6. Worker inserts ledger burn entries (e.g. `BurnMonthly -2.0`)
7. Worker marks job `Succeeded`
8. UI polls job status and shows results
9. Admin sees ledger entry in history

### Scenario 4 — Org purchases a credit pack

1. Org admin opens “Buy credits”
2. Selects “Season Pack”
3. Stripe Checkout completes payment
4. Stripe webhook fires `payment_intent.succeeded`
5. System creates `OrganizationCreditPurchase`
6. Inserts ledger entry `PurchasePack +150 purchased credits`
7. Admin panel balances update

### Scenario 5 — Daily credits granted and capped

1. Each day at midnight UTC, scheduler runs
2. For each org with daily enabled:
   - check current month daily grants sum
   - if month cap not reached:
     - insert `GrantDaily +5`
3. If cap reached (e.g. Free 30/month):
   - do nothing
4. Daily unused credits do not roll over to next day

### Scenario 6 — Burn rate updated without deploy

1. Admin updates `BurnRateVersion` for `ai_audit` from 10.0 → 8.0
2. New jobs use latest burn rate
3. Old jobs keep their recorded burn rate snapshot in ledger/job metadata

### Scenario 7 — Plan credits updated without changing plan identity

1. You update Coach monthly included credits from 120 → 150
2. Create a new `PlanVersion` effective from today
3. New subscriptions/renewals use new version
4. Existing history remains correct because they reference older version

### Scenario 8 — Manual adjustment (support/admin)

1. Org admin (or internal staff if you add it) issues adjustment +50
2. Insert ledger `Adjustment +50` with reason
3. Balances update and history shows why

---

## 9) What must be configurable from DB (no deploy)

- Plans: add/remove/disable
- Plan prices and included credits (versioned)
- Daily credit policy (enable/disable, amount, monthly cap)
- Credit pack definitions (versioned)
- Burn rates (versioned)
- Rollover policy (enable/disable, limits)

---
