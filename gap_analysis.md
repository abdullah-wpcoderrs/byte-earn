# User Wallet Route Gap Analysis

Reviewed on June 13, 2026.

Scope:
- Wallet page: `app/(app)/wallet/page.tsx`
- Wallet UI: `components/wallet/wallet-dashboard.tsx`
- Wallet data: `lib/wallet-data.ts`, `lib/wallet.ts`
- Withdrawal action: `app/(app)/wallet/actions.ts`
- Related user-route defects found during review: feed comment sheet and profile referral URL.

## Executive Summary

The wallet route is functional and now makes the actionable available balance primary. Gross lifetime earnings remain visible as secondary context, while locked earnings, reserved withdrawals, paid withdrawals, and per-source withdrawability are itemized.

The strongest remaining production gaps are:
- Add focused tests for available-balance math, especially mixed earning sources and pending or approved withdrawals.
- Improve wallet history mobile rendering.
- Complete authenticated browser QA for wallet, profile, onboarding, and feed comment flows.

Two related user-route bugs were also found:
- The feed comment sheet was rendered inside a transformed action rail, which can break fixed positioning on mobile. This has been patched by portaling the shared `Sheet` to `document.body`.
- Profile and onboarding referral URLs used a fake `https://appdomain.com` fallback. This has been patched so server-rendered pages derive the origin from the hosted request headers, while client sharing falls back to `window.location.origin`.

## Current Wallet Behavior

The wallet page loads `getWalletPageData()` and passes the result into `WalletDashboard`.

The current dashboard shows:
- Available for withdrawal, calculated from unlocked sources minus reserved and paid withdrawals.
- Lifetime earnings, calculated with `getTotalCredits(wallet)`.
- Referral earnings.
- Sponsored task earnings.
- Available for withdrawal.
- Total withdrawn.
- A withdrawal modal with bank details prefilled from the profile.
- A link to `/wallet/history`.

`lib/wallet-data.ts` calculates source totals from `credit_ledger`, then subtracts pending, approved, and paid withdrawals from the gross total of currently unlocked earning sources to produce `availableCredits`.

## Wallet Gaps

### 1. "Master balance" overstates what users can act on

Status: Resolved

`components/wallet/wallet-dashboard.tsx` now makes available withdrawal balance the primary figure and shows gross lifetime earnings as secondary context.

Implemented:
- Removed the primary "Master balance" presentation.
- Added helper text explaining lifetime earnings, locked earnings, reserved withdrawals, paid withdrawals, and available balance.
- Added shared wallet math helpers used by the dashboard data and withdrawal request action.

### 2. Locked earning sources are not itemized

Status: Resolved in backend/UI summary

`lib/wallet-data.ts` respects platform unlock settings when calculating `availableCredits`, but the UI only says "Some earnings may be locked according to platform rules."

Impact:
- Users cannot tell which earnings are locked or why.
- Admin toggles may appear broken because the wallet total stays visible while availability changes.

Implemented:
- `getWalletPageData()` now returns a per-source availability breakdown.
- The wallet UI now shows each earning source as withdrawable or locked.

### 3. Pending and approved withdrawals are invisible on the dashboard

Status: Resolved in backend/UI summary

The history page lists withdrawals, but the main wallet page does not show pending or approved withdrawal totals. `availableCredits` subtracts these statuses, so availability can drop with no dashboard explanation.

Impact:
- Users may think credits disappeared after submitting a withdrawal.

Implemented:
- The wallet data layer now returns withdrawal totals split by pending, approved, paid, and rejected credits.
- The wallet dashboard now shows reserved and paid withdrawal credits.

### 4. Withdrawal modal lacks balance guardrails

Status: Resolved

The modal now displays:
- Available naira.
- Conversion rate.
- Whether bank details came from the profile.
- Reserved withdrawal credits.

Implemented:
- Amount input now has a max based on available naira.
- Withdrawal submission is disabled when no credits are available.
- Payout review and profile-prefill copy is shown before submission.

### 5. History page table is usable, but mobile could be stronger

Status: Open

`app/(app)/wallet/history/page.tsx` uses horizontally scrollable tables. This avoids breakage, but it is not ideal for repeated mobile use.

Impact:
- Users on phones must pan sideways to inspect status and notes.

Recommendation:
- Keep tables for desktop.
- Render compact transaction rows/cards on small screens.

### 6. Wallet calculations need direct regression coverage

Status: Open

The available-balance rules are important enough for unit-level coverage. Current behavior depends on correctly aligning frontend math, server action math, platform settings, and database constraints.

Recommended cases:
- Paid withdrawals reduce available balance but not lifetime earnings.
- Pending and approved withdrawals reserve balance.
- Rejected withdrawals do not reserve balance.
- Locked source earnings are visible but unavailable.
- Mixed source balances cannot over-withdraw when only some sources are unlocked.

## Related User-Route Findings

### Feed comment sheet on mobile

Status: Patched

`PostActions` renders inside a transformed action rail on `FeedCard`. The shared `Sheet` was previously rendered as a descendant of that transformed element. On mobile, this can make the fixed-position comment sheet calculate its viewport from the transformed ancestor instead of the screen.

Patch:
- `components/ui/sheet.tsx` now portals the sheet to `document.body`.
- The sheet now has a fixed overlay click target, scroll containment, `role="dialog"`, `aria-modal="true"`, and safe-area bottom padding.

### Profile referral URL

Status: Patched

The profile route built referral URLs with `process.env.NEXT_PUBLIC_APP_URL ?? "https://appdomain.com"`. When the environment variable was missing, users saw a fake URL.

Patch:
- `lib/share.ts` no longer contains the fake fallback.
- `lib/request-origin.ts` derives the request origin from `x-forwarded-host`, `host`, and `x-forwarded-proto`.
- `app/(app)/profile/page.tsx` and `app/onboarding/page.tsx` pass the real request origin into `buildReferralUrl()`.
- Client-side share/copy still falls back to `window.location.origin`.

## Recommended Next Steps

1. Add tests around available-balance calculation and withdrawal source-lock behavior.
2. Improve `/wallet/history` mobile rendering with stacked rows.
3. Complete authenticated browser QA for `/wallet`, `/wallet/history`, `/feed`, `/profile`, `/onboarding`, and `/tasks`.
