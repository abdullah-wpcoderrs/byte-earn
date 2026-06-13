# Remaining Implementation Checklist

Updated on June 13, 2026.

Source: `gap_analysis.md` plus backend feature review.

## Backend Feature Inventory

- [x] Referral codes are stored on `profiles.referral_code`.
- [x] Referral count is stored on `profiles.referral_count`.
- [x] Wallet/account credit total is stored on `profiles.credits_balance`.
- [x] Referral attribution lifecycle is stored in `referral_attributions.status`.
- [x] Referral attribution statuses are `pending`, `qualified`, and `rejected`.
- [x] Referral reward paid per attribution is stored on `referral_attributions.reward_credits`.
- [x] Referral visits are stored in `referral_visits`.
- [x] Wallet earning entries are stored in `credit_ledger`.
- [x] Wallet earning sources are `referral`, `sponsored_task`, `watch_time`, `admin_credit`, and `adjustment`.
- [x] Withdrawal requests are stored in `withdrawals`.
- [x] Withdrawal statuses are `pending`, `approved`, `paid`, and `rejected`.
- [x] Sponsored task definitions are stored in `sponsored_tasks`.
- [x] Sponsored task attempts and provider verification states are stored in `task_sessions`.
- [x] Provider event/revenue data is stored in `sponsored_task_provider_events`.
- [x] Platform feature toggles are stored in `platform_settings`.
- [x] Reward amounts are stored in `reward_rules`.
- [x] Credit-to-fiat conversion is stored in `finance_settings`.

## Current Backend Figures and Counts

- [x] Default qualified referral bonus: `100` credits from `reward_rules.action = 'referral_qualified'`.
- [x] Default credit conversion: `100` credits equals `$0.50` from `finance_settings`.
- [x] Default exchange rate: `$1.00` equals `NGN 1000` from `finance_settings`.
- [x] Default referral bonus fiat display: `100` credits equals about `NGN 500` at default rates.
- [x] Default sponsored task milestone fallback: `0` credits, enabled, capped at `5000` credits per action.
- [x] Default watch-time milestone fallback: `0` credits, disabled, capped at `5000` credits per action.
- [x] Default admin credit action: enabled, minimum `1`, maximum `100000` credits per action.
- [x] Default admin adjustment action: enabled, minimum `1`, maximum `100000` credits per action.
- [x] Default daily watch limit: `1800` seconds.
- [x] Default upload limit: `50` MB.
- [x] Default sponsored tasks enabled: `false`.
- [x] Default sponsored withdrawals unlocked: `false`.
- [x] Default referral withdrawals unlocked: `true`.
- [x] Default watch-time withdrawals unlocked: `false`.
- [x] Default admin-credit withdrawals unlocked: `true`.
- [x] Default adjustment withdrawals unlocked: `true`.
- [x] Default leaderboard referral scoring: enabled.
- [x] Default leaderboard engagement scoring: enabled.
- [x] Default leaderboard bookmark scoring: disabled.
- [x] Default leaderboard watch-time scoring: disabled.
- [x] Default leaderboard scoring weights: referrals `referral_count * 100`, engagement `(likes + comments) * 10`, bookmarks `bookmarks * 15`, watch-time/credits `credits_balance`.
- [x] Sponsored task per-user caps are stored per task in `sponsored_tasks.limit_per_user`.
- [x] Sponsored task total completions are counted in `sponsored_tasks.completions_count`.
- [x] Post counts tracked per post include likes, comments, bookmarks, shares, impressions, total watch seconds, and watch sessions.

## Backend Analysis Gaps To Implement

- [x] Add a server-side wallet/account summary function that returns all backend counts needed by `/wallet` and `/profile`.
- [x] Return current referral bonus credits from `reward_rules` to the profile/referral UI.
- [x] Return referral bonus fiat value using active `finance_settings`.
- [x] Return referral totals split by `pending`, `qualified`, and `rejected`.
- [x] Return referral visit count from `referral_visits`.
- [x] Return qualified referral payout total from `referral_attributions.reward_credits`.
- [x] Return referral ledger total from `credit_ledger` and compare it to attribution payout total.
- [x] Return wallet source totals for referral, sponsored task, watch time, admin credit, and adjustment.
- [x] Return withdrawal totals split by `pending`, `approved`, `paid`, and `rejected`.
- [x] Return reserved withdrawal credits for `pending + approved`.
- [x] Return paid withdrawal credits separately from reserved withdrawals.
- [x] Return locked versus withdrawable credits per source using `platform_settings`.
- [x] Return active finance conversion fields with every wallet summary.
- [x] Return sponsored task totals: active tasks, pending sessions, completed sessions, suspicious sessions, rejected sessions, and total task reward credits.
- [x] Return provider event totals: clicks, impressions, revenue, processed events, and unprocessed events.
- [x] Add consistency checks for `profiles.credits_balance` versus summed `credit_ledger`.
- [x] Add consistency checks for `profiles.referral_count` versus qualified `referral_attributions`.
- [x] Add consistency checks for `sponsored_tasks.completions_count` versus completed `task_sessions`.

## Referral Backend Implementation

- [x] Show the current referral bonus amount on `/profile`.
- [x] Show the current referral bonus amount on `/onboarding`.
- [x] Show the current referral bonus amount near the referral share/copy controls.
- [x] Show total referrals using `profiles.referral_count`.
- [x] Show pending referral count from `referral_attributions`.
- [x] Show qualified referral count from `referral_attributions`.
- [x] Show rejected referral count from `referral_attributions`.
- [x] Show total referral credits earned from qualified attribution rewards.
- [x] Add `reward_credits` to `ReferralList` output.
- [x] Add `qualified_at` to `ReferralList` output.
- [x] Add mobile-friendly referral rows that include status, reward credits, and qualification date.
- [x] Verify disabled `referral_qualified` reward rule still increments referral count but pays `0` credits.
- [x] Verify referral qualification is idempotent and cannot double-pay.
- [x] Verify self-referrals and duplicate referrals remain rejected.

## Wallet Backend Implementation

- [x] Rework the wallet hero metric so the primary number is not misleading.
- [x] Rename the current "Master balance" label to "Lifetime earnings" if it remains gross.
- [x] Make "Available for withdrawal" visually primary if it is the main actionable balance.
- [x] Add helper text explaining lifetime earnings, reserved withdrawals, paid withdrawals, locked earnings, and available balance.
- [x] Extend `WalletBreakdown` or add a new wallet summary type for per-source availability.
- [x] Return platform source-lock metadata from `getWalletPageData()`.
- [x] Calculate per-source gross credits for referral, sponsored task, watch time, admin credit, and adjustment earnings.
- [x] Mark each source as withdrawable or locked based on platform settings.
- [x] Add a dashboard value for credits reserved by pending and approved withdrawals.
- [x] Add a dashboard value for paid withdrawal credits.
- [x] Add a compact wallet summary that shows gross earnings, reserved withdrawals, paid withdrawals, locked credits, and available credits.
- [x] Keep frontend availability math aligned with `requestWithdrawalAction`.
- [x] Keep frontend availability math aligned with `request_withdrawal_atomically`.

## Withdrawal Modal Guardrails

- [x] Show available withdrawal value in naira inside the withdrawal modal.
- [x] Show available withdrawal credits inside the withdrawal modal.
- [x] Show the active credit conversion rate near the amount input.
- [x] Show reserved withdrawal credits in the modal if any exist.
- [x] Set the withdrawal amount input `max` based on available naira.
- [x] Disable submission when available balance is zero.
- [x] Add concise payout copy explaining pending review and payout status.
- [x] Show that bank details are prefilled from the user profile.
- [x] Add a profile edit link or hint if bank details are missing or incorrect.
- [x] Keep server-side validation as the source of truth even after adding client guardrails.

## Sponsored Task Backend Counts

- [x] Show active sponsored task count on the tasks page.
- [x] Show total available task credits from active `sponsored_tasks.reward_credits`.
- [x] Show completed-today task count per user.
- [x] Show pending task session count per user.
- [x] Show suspicious task session count per user.
- [x] Show rejected-today task session count per user.
- [x] Show lifetime completed task count per user.
- [x] Show lifetime sponsored-task credits earned per user.
- [x] Verify task credits write to both `credit_ledger` and `profiles.credits_balance`.
- [x] Verify task completion increments `sponsored_tasks.completions_count`.
- [x] Verify provider events reconcile only once per unique event/session.

## Platform and Admin Backend Visibility

- [x] Show active reward rules and credit amounts in user-facing contexts where users make earning decisions.
- [x] Show whether referral, sponsored, watch-time, admin-credit, and adjustment earnings are withdrawable.
- [x] Show current finance conversion rate in wallet/history contexts.
- [x] Add admin diagnostics for mismatched referral counts.
- [x] Add admin diagnostics for mismatched credit balances.
- [x] Add admin diagnostics for mismatched task completion counts.
- [x] Add admin diagnostics for unprocessed provider events.
- [x] Add admin diagnostics for pending withdrawals and approved-but-unpaid withdrawals.

## Wallet History Mobile UX

- [x] Keep the current desktop transaction and withdrawal tables.
- [x] Add stacked mobile rows for withdrawal requests.
- [x] Add stacked mobile rows for transaction ledger entries.
- [x] Hide or de-emphasize horizontally scrollable tables on small screens.
- [x] Ensure long notes, descriptions, dates, and amounts wrap cleanly on mobile.
- [ ] Verify `/wallet/history` at common mobile widths.

## Mobile Feed Verification

- [x] Patch mobile feed comment sheet so it is not trapped inside the transformed feed action rail.
- [x] Portal shared `Sheet` overlays to `document.body`.
- [x] Add scroll containment and mobile safe-area padding to the comment sheet.
- [x] Add structural smoke coverage for portal, viewport overlay, scroll containment, overlay close, and safe-area padding.
- [ ] Verify comment sheet open and close behavior on an authenticated mobile feed session.
- [x] Verify structurally that the comment sheet covers the viewport instead of the action rail.
- [ ] Verify visually that the comment textarea, post button, messages, and comments list remain reachable above bottom navigation.
- [x] Verify structurally that overlay click closes the sheet.
- [ ] Verify visually that the close button remains visible after scrolling comments.

## Referral URL Verification

- [x] Remove the fake `https://appdomain.com` referral URL fallback.
- [x] Derive profile and onboarding referral URLs from the hosted request origin.
- [x] Keep client-side referral share and copy behavior based on the browser origin.
- [x] Verify structurally that `/profile` displays the hosted request origin in the referral URL.
- [x] Verify structurally that `/onboarding` displays the hosted request origin in the referral URL.
- [x] Verify copy URL uses the current browser origin when `NEXT_PUBLIC_APP_URL` is absent.
- [x] Verify share caption includes the correct referral URL.
- [x] Verify referral URL generation still works when `NEXT_PUBLIC_APP_URL` is intentionally configured.

## Regression Tests

- [x] Add direct tests for wallet available-balance calculation.
- [x] Test that paid withdrawals reduce available balance but not lifetime earnings.
- [x] Test that pending withdrawals reserve balance.
- [x] Test that approved withdrawals reserve balance.
- [x] Test that rejected withdrawals do not reserve balance.
- [x] Test that locked source earnings are visible but unavailable.
- [x] Test mixed source balances when only some sources are unlocked.
- [x] Test that withdrawal requests cannot exceed the database-authoritative available balance.
- [x] Test referral count equals qualified referrals.
- [x] Test referral bonus credits come from `reward_rules`.
- [x] Test referral bonus fiat display comes from active `finance_settings`.
- [x] Test disabled referral reward rule pays `0` credits without blocking referral qualification.
- [x] Test task completion counts match completed sessions.
- [x] Test task reward credits cannot double-pay.
- [ ] Add or update UI tests for wallet and referral labels if a UI test harness exists.

## Release Checks

- [x] Run `npm run lint`.
- [x] Run `npm run test`.
- [x] Run `npm run build`.
- [ ] Perform authenticated browser QA for `/wallet`, `/wallet/history`, `/feed`, `/profile`, `/onboarding`, and `/tasks`.
- [ ] Update `gap_analysis.md` statuses after implementation is complete.
