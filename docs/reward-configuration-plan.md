# Reward Configuration Plan

## Goal

Rewards must be configured by admins, enforced server-side, and recorded in `credit_ledger`. The browser must never decide reward amounts, eligibility, user IDs, or whether a reward has been earned.

## Reward Actions From The Product Plan

| Action key | Product area | When it should pay | Default source |
| --- | --- | --- | --- |
| `referral_qualified` | Referral loops | A referred user becomes active after the required activation/onboarding flow. | `referral` |
| `sponsored_task_milestone` | Sponsored tasks | A user crosses a configured watch milestone for an active sponsored task. | `sponsored_task` |
| `watch_time_milestone` | Feed/watch-time rewards | A user crosses a platform-approved watch-time threshold, subject to daily caps. | `watch_time` |
| `admin_credit` | Admin management | An admin manually credits a user with an audited reason. | `admin_credit` |
| `admin_adjustment` | Admin management | An admin deducts or corrects a user balance with an audited reason. | `adjustment` |

## Admin Configuration Model

Create a `reward_rules` table as the admin source of truth:

| Column | Purpose |
| --- | --- |
| `action` | Stable key such as `referral_qualified`. |
| `label` | Human-readable label for admin UI. |
| `credits` | Server-side credit amount. |
| `enabled` | Allows admins to pause a reward without code changes. |
| `description` | Admin-facing explanation of qualification rules. |
| `updated_by` | Admin who last changed the rule. |
| `updated_at` | Last change timestamp. |

Reward rules also support action constraints:

| Column | Purpose |
| --- | --- |
| `min_credits_per_action` | Lowest allowed credit amount for actions controlled by this rule. |
| `max_credits_per_action` | Highest allowed credit amount for actions controlled by this rule. Empty means no cap. |

## Credit To Fiat Conversion Model

The current product baseline is `100 credits = $0.50 USD` and `$1.00 USD = NGN 1,000`. That rate must become admin-configurable and platform-wide.

Add a `conversion_settings` or `platform_finance_settings` table as the single source of truth:

| Column | Purpose |
| --- | --- |
| `credits_per_unit` | The number of credits in the configured credit bundle. Default: `100`. |
| `usd_per_unit` | USD value for the configured credit bundle. Default: `0.50`. |
| `ngn_per_usd` | Admin-controlled FX rate. Default: `1000`. |
| `active` | Only one active conversion setting should be used at a time. |
| `updated_by` | Admin who last changed the conversion rate. |
| `updated_at` | Last change timestamp. |

Derived values:

- `usd_per_credit = usd_per_unit / credits_per_unit`.
- `ngn_per_credit = usd_per_credit * ngn_per_usd`.
- `credits_to_usd = credits * usd_per_credit`.
- `credits_to_ngn = credits * ngn_per_credit`.
- `ngn_to_credits = floor(ngn / ngn_per_credit)`.

Conversion enforcement rules:

- Admins may adjust the rate, but users must never submit or override conversion values from the browser.
- Withdrawal requests must calculate `amount_naira` server-side using the active conversion rate at request time.
- Store a conversion snapshot on withdrawal rows before production launch, so old withdrawal requests are auditable even if admins later change rates.
- Wallet displays should receive the active rate from server-side data loading and use it only for display.
- The active rate should be cached briefly, then revalidated when admins update finance settings.
- Every conversion-rate change should write an audit event such as `admin.finance_settings.updated`.
- Changing the conversion rate should affect future calculations only. Existing credit ledger rows remain credit-denominated.

## Enforcement Rules

- Reward rules are editable only by admins.
- Conversion rates are editable only by admins.
- Reward payment happens inside trusted server code or Postgres `SECURITY DEFINER` functions/triggers.
- Every automatic reward must be idempotent. A refresh, webhook retry, or duplicate form submission must not create a second payout.
- Every credit movement must write to `credit_ledger`.
- `profiles.credits_balance` may be updated only by trusted server/admin paths or database functions.
- Referral rewards are withdrawable immediately because they use the `referral` ledger source.
- Sponsored and watch-time rewards remain subject to platform withdrawal locks.

## Admin UI Plan

1. Add `/admin/rewards`.
2. Show one row per reward action with credits, enabled status, and updated timestamp.
3. Allow admins to edit credits and enabled status in a modal.
4. Show a warning when disabling a reward that is currently used by active tasks or referral onboarding.
5. Add a finance/rates panel for `credits_per_unit`, `usd_per_unit`, and `ngn_per_usd`.
6. Preview derived values, for example `1 credit = NGN 5`.
7. Audit every reward update as `admin.reward_rule.updated`.
8. Audit every conversion update as `admin.finance_settings.updated`.

## Referral Reward Implementation

Referral counting and payment should happen when a referred profile transitions to `active`.

Required checks:

- Referral attribution exists and is still `pending`.
- Referrer exists.
- Referrer and referred profile are different users.
- Referred profile status is `active`.
- Referrer is not suspended.
- The reward amount comes from the `referral_qualified` rule. If the rule is disabled, the referral still qualifies and counts, but pays `0` credits until admins re-enable or backfill a payout policy.

On success:

- Mark attribution as `qualified`.
- Set `qualified_at`.
- Store the reward amount in `referral_attributions.reward_credits`.
- Increment the referrer's `profiles.referral_count` once.
- Add referral credits to the referrer's `profiles.credits_balance`.
- Insert one `credit_ledger` row with source `referral`.

## Implementation Checklist

### Database

- [x] Add `conversion_settings` or `platform_finance_settings` migration with default baseline rates.
- [x] Enforce one active conversion setting, either with a partial unique index or a singleton row.
- [x] Enable RLS on the conversion table.
- [x] Add authenticated read policy if the app needs server/client reads through Supabase.
- [x] Add admin-only insert/update policy.
- [x] Add withdrawal conversion snapshot columns, such as `credits_per_unit`, `usd_per_unit`, `ngn_per_usd`, and `ngn_per_credit_snapshot`.
- [x] Keep `credit_ledger` credit-denominated; do not rewrite historical credit rows when rates change.

### Server Utilities

- [x] Replace hardcoded values in `lib/money.ts` with pure conversion helpers that accept a rate object.
- [x] Add a server loader such as `getActiveConversionSettings()`.
- [ ] Cache the active conversion settings with a clear tag, for example `finance-settings`.
- [x] Revalidate the finance-settings tag after admin updates.
- [x] Ensure withdrawal actions calculate `amount_naira` server-side from active settings.
- [ ] Ensure admin withdrawal review reads stored withdrawal snapshots where available.

### Admin UI

- [x] Add a `/admin/rewards` page or a dedicated section under platform controls.
- [x] List all reward rules with credits, enabled status, and last update.
- [x] Add edit modal for reward credits, enabled state, and action constraints.
- [x] Add finance conversion form for `credits_per_unit`, `usd_per_unit`, and `ngn_per_usd`.
- [x] Show derived preview values.
- [x] Add success/error toasts for reward and conversion updates.

### Platform Integration

- [x] Update wallet dashboard to display NGN/USD using the active conversion settings.
- [x] Update withdrawal modal to show server-derived available fiat value.
- [ ] Update admin user tables and withdrawal pages where fiat values appear.
- [x] Wire sponsored task milestone credits to `sponsored_task_milestone`.
- [x] Wire watch-time bonus credits to `watch_time_milestone`.
- [ ] Update any leaderboard or analytics displays that convert credits to fiat.
- [x] Confirm referral rewards still pay credits only; fiat is display/withdrawal conversion.

### Security And QA

- [x] Confirm users cannot submit conversion rates in withdrawal requests.
- [x] Confirm non-admin users cannot update reward or conversion settings through RLS.
- [x] Enforce admin credit/adjustment min and max constraints server-side.
- [x] Add smoke tests for finance settings, money helpers, and server-side withdrawal conversion.
- [ ] Test changing the rate and verify wallet displays update while historical withdrawals remain auditable.
- [x] Run `npm run test` and `npm run build`.
