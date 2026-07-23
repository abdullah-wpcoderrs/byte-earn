# Implementation Checklist

Updated on July 13, 2026.

Source of truth: `web-app/issues.md`.

## How To Use This Checklist

- [ ] Complete items in priority order: blockers, major runtime gaps, UX fixes, then QA and launch polish.
- [ ] Keep `web-app/issues.md` as the review log and use this file as the execution plan.
- [ ] Check items only after code, data, and QA evidence are complete.

## Phase 1 - Release Blockers

- [x] Reconcile the migration journal with the live SQL set.
- [x] Add `0043`, `0044`, and `0045` to the production migration path if they are not already applied.
- [x] Update the documented release procedure so it reflects the actual migration sequence the app now requires.
- [ ] Verify staging or production has the expected withdrawal fields, payout constraints, referral hardening, authorization changes, and `suspicious` task-session enum value.
- [x] Record the verified migration state in launch documentation.

## Phase 2 - Wallet and Withdrawal Contract

- [x] Confirm whether `request_withdrawal_atomically` is callable through the current Supabase server path.
- [x] If the `private` schema is not exposed, add a safe public wrapper or move the call to an explicitly trusted server-only path.
- [ ] Re-test the wallet server action against the final RPC path.
- [ ] Run authenticated staging checks for pending, approved, paid, rejected, insufficient-balance, and locked-source withdrawal cases.
- [ ] Update wallet error handling or UI copy if runtime behavior differs from the current assumptions.

## Phase 3 - Referral Attribution Reliability

- [x] Change anonymous referral-code resolution in `/ref/[code]` to use a trusted lookup path instead of the user-scoped client.
- [x] Keep visit creation server-trusted so anonymous referral visits are recorded consistently.
- [ ] Verify signup attribution still resolves the same referrer after the route change.
- [ ] Test anonymous visit, signup, self-referral, duplicate referral, qualified referral, and payout-eligibility flows end to end.
- [ ] Add any missing analytics or diagnostics needed to measure visit-to-signup and signup-to-qualified conversion.

## Phase 4 - Provider and Sponsored Task Operations

- [x] Add a reliable scheduler or worker for `POST /api/tasks/reconcile/adsterra`.
- [x] Define retry, bounded backfill, and failure-alert behavior for reconciliation runs.
- [x] Add an operator-friendly replay procedure for missed or failed reconciliation windows.
- [ ] Validate CPAGrip and Adsterra production configuration against the real deployed URLs.
- [ ] Keep sponsored withdrawals locked until at least one full provider reconciliation cycle is verified.

## Phase 5 - Admin Readiness and Launch Gating

- [x] Expand the admin readiness panel to include Paystack configuration status.
- [x] Add provider credential and provider-mode readiness checks.
- [x] Show migration/version readiness in the admin diagnostics surface.
- [x] Add reconciliation freshness, storage bucket, SMTP, and other launch-critical environment checks.
- [ ] Make the readiness panel a real launch gate instead of an informational summary.

## Phase 6 - Public Auth and Activation UX

- [x] Hide the left marketing panel on mobile for the auth gateway route `/`.
- [x] Keep the auth page mobile layout focused on the form only.
- [x] Hide the lower activation explainer and step list on mobile.
- [x] Remove the Paystack CTA from the auth-form flow on all screen sizes.
- [x] Remove the Paystack CTA from `/activate` entirely.
- [ ] Re-check desktop spacing after the mobile-only layout changes.

## Phase 7 - Product Copy and Trust Messaging

- [x] Replace exaggerated earning language with concrete, supportable product copy.
- [ ] Explain activation pricing, payout timing, source locks, and provider-dependent availability more clearly.
- [ ] Add or finalize terms, privacy, support, eligibility, referral, and payout-lock documentation before paid traffic.
- [x] Review public pages for any remaining guaranteed-income or oversized reward language.

## Phase 8 - Authenticated QA

- [ ] Run authenticated browser QA at 360px, 430px, 768px, 1024px, 1440px, and 1728px widths.
- [ ] Verify signup to payment to onboarding on a real staged account.
- [ ] Verify referral link visit, signup, activation, qualification, and reward behavior.
- [ ] Verify first post, feed interactions, profile actions, wallet flows, tasks, moderation, and admin review.
- [ ] Verify provider callback and reconciliation evidence appears in the expected database and admin surfaces.

## Phase 9 - Targeted Mobile Verification

- [x] Verify the auth gateway on mobile renders only the auth form and no left-side panel.
- [x] Verify the lower auth-section explainer stays hidden on mobile but still behaves correctly on desktop.
- [x] Verify `/activate` no longer shows a Paystack CTA on mobile or desktop.
- [ ] Verify `/wallet/history` on common mobile widths.
- [ ] Verify the feed comment sheet open and close behavior on an authenticated mobile session.
- [ ] Verify the comment textarea, post button, messages, and comments list remain reachable above bottom navigation.
- [ ] Verify the comment-sheet close button remains visible after scrolling.

## Phase 10 - Regression Coverage and Closeout

- [x] Add or update UI-level tests for wallet and referral labels if a UI harness exists.
- [x] Re-run `npm run lint`.
- [x] Re-run `npm run test`.
- [x] Re-run `npm run build`.
- [ ] Update `web-app/issues.md` with a new dated review entry after implementation and QA are complete.
- [x] Update any launch or route QA docs that changed during implementation.

## Implementation Map

- [x] `GAP-01` -> migration journal and release-process reconciliation.
- [ ] `GAP-02` -> withdrawal RPC exposure and staging proof.
- [x] `GAP-03` -> Adsterra scheduler and reconciliation operations.
- [x] `GAP-04` -> anonymous referral attribution fix.
- [x] `GAP-05` -> provider and Paystack readiness visibility.
- [ ] `GAP-06` -> authenticated browser QA matrix.
- [x] `GAP-07` -> trust and acquisition copy cleanup.
- [x] `GAP-08` -> hide auth left panel on mobile.
- [x] `GAP-09` -> hide lower auth explainer on mobile.
- [x] `GAP-10` -> remove Paystack CTA from activation flow.
