# Sponsored Task Production Task Checklist

Use this checklist to review implementation progress and the remaining release gates.

## Phase 0: Decision and Provider Setup

External account setup remains pending and must be completed in Adsterra/CPAGrip dashboards before Phase 2 can be fully tested.

- Provider env setup guide: [provider-env-key-setup-plan.md](provider-env-key-setup-plan.md)
- User flow and security explainer: [sponsored-task-user-flow-and-security-explainer.md](sponsored-task-user-flow-and-security-explainer.md)

- [ ] Confirm Adsterra account approval and active SmartLink / Direct Link inventory.
- [ ] Generate an Adsterra Publisher API key.
- [ ] Confirm the exact Adsterra SmartLink URL format to use in production.
- [ ] Confirm Adsterra stats can be grouped by `placement_sub_id` from the `psid` query parameter.
- [ ] Confirm CPAGrip offerwall or offer-link postback macro names inside the CPAGrip dashboard.
- [ ] Decide how to treat existing `monetag` rows: migrate to `adsterra`, archive, or keep as legacy-only.
- [ ] Keep sponsored withdrawals locked until provider reconciliation and reward idempotency are complete.

## Phase 1: Database Contract

- [x] Add `adsterra` to the `task_provider` enum.
- [x] Keep `monetag` in the enum for legacy compatibility unless a later enum rebuild is planned.
- [x] Add provider metadata fields or a provider config table for placement IDs, tracking param names, and reconciliation mode.
- [x] Add a provider events table for CPAGrip postbacks and Adsterra reconciliation rows.
- [x] Add unique constraints for provider event idempotency.
- [x] Add a trusted `complete_sponsored_task_session` RPC.
- [x] Make the RPC update session status, insert ledger entry, update `profiles.credits_balance`, and increment task completions in one transaction.
- [x] Add cap enforcement inside the RPC for daily per-user caps and global campaign caps.
- [x] Add pending session expiry fields or cleanup rules.
- [x] Update `db/schema.ts` manually after SQL changes.
- [x] Provide the SQL migration file for manual execution.

## Phase 2: Adsterra SmartLink Rewire

- [x] Replace Monetag admin labels with Adsterra SmartLink labels.
- [x] Replace Monetag user task section naming with Adsterra-aware copy.
- [x] Change SmartLink tracking from `subid=<session_id>` to `psid=<session_id>` for Adsterra tasks.
- [x] Add `ADSTERRA_API_KEY` environment variable.
- [x] Add `ADSTERRA_RECONCILE_SECRET` environment variable.
- [x] Add `ADSTERRA_STATS_ENDPOINT` environment variable after confirming the final Publisher API stats URL.
- [x] Add an internal Adsterra reconciliation route or scheduled job.
- [x] Query Adsterra Publisher API with `X-API-Key`.
- [x] Match Adsterra `placement_sub_id` rows back to local `task_sessions.id`.
- [x] Complete qualifying Adsterra sessions through the trusted RPC only.
- [x] Deprecate or remove `/api/postback/monetag` from active routing.
- [x] Update docs and platform admin copy to stop presenting Monetag as an active provider.

## Phase 3: CPAGrip Hardening

- [x] Store CPAGrip tracking parameter names in provider configuration instead of hard-coding `subid`.
- [x] Capture CPAGrip provider conversion ID, offer ID, payout, status, IP, country, and raw payload.
- [x] Verify callback secret/password before processing.
- [x] Make duplicate CPAGrip postbacks return a provider-compatible success response.
- [x] Complete CPAGrip sessions through the trusted RPC only.
- [x] Add rejected or chargeback handling if CPAGrip sends non-approved statuses.

## Phase 4: Internal Sponsored Task Validation

- [x] Add internal task subtype support.
- [x] Define validation rules for `share_link`, `visit_url`, `watch_media`, and `manual_review`.
- [x] Stop rewarding internal share tasks from clipboard or share API success alone.
- [x] Route share/manual internal tasks into pending admin validation instead of issuing instant credits.
- [x] Reward visit tasks only after server-created session, dwell-time rule, and session-bound completion.
- [x] Reward watch-media tasks only through server-side milestone checks.
- [x] Add manual proof review flow where automatic validation is weak.

## Phase 5: Start Task and Session Security

- [x] Make `startTask` ignore client-supplied provider.
- [x] Fetch task by `id` and `status = active`.
- [x] Block starts when `sponsored_tasks_enabled` is false.
- [x] Enforce global cap before creating a session.
- [x] Capture IP address and user agent at session start.
- [x] Add per-user and per-task cooldowns.
- [x] Limit active pending sessions per user and task.
- [x] Expire stale pending sessions.
- [x] Add server-side validation for approved provider domains.

## Phase 6: Admin Production Controls

- [x] Require provider-specific fields before task activation.
- [x] Add task subtype, global cap, and provider configuration controls.
- [ ] Add country/device targeting controls if needed for provider campaigns.
- [x] Add an activation readiness check for each provider.
- [x] Replace hard delete with archive behavior.
- [x] Preserve task sessions and provider events as immutable history.
- [x] Add admin audit logs for create, update, activate, pause, archive, and delete attempts.
- [x] Add system audit logs for provider callback, reconciliation, reward, duplicate, and rejection events.

## Phase 7: Analytics and Finance Reconciliation

- [x] Track starts, provider confirmations, provider stats, rewards, and rejections.
- [x] Show Adsterra clicks, impressions, CTR, CPM, revenue, and pending sessions.
- [x] Show CPAGrip conversions, payout, rejected conversions, and conversion rate.
- [x] Show internal pending review, completions, spend, and remaining budget.
- [x] Add provider revenue versus credits-issued reporting.
- [x] Add raw pending validation view for support investigation.
- [ ] Add task-level CSV export for provider events and rewarded sessions.
- [ ] Add first-party impression tracking if product analytics need card-level impressions.

## Phase 8: Fraud and Abuse Controls

- [x] Add same-IP velocity checks.
- [ ] Add same-device or fingerprint controls if a privacy/legal review approves the approach.
- [ ] Add VPN/proxy risk checks before making sponsored rewards withdrawable.
- [ ] Detect country mismatch between task start and provider confirmation.
- [x] Add suspicious session statuses and an admin review queue.
- [x] Add fraud-safe limits for new users and low-trust accounts.

## Phase 9: User Experience

- [x] Replace browser alerts with in-app status messages for sponsored task starts and submissions.
- [x] Show pending verification state after Adsterra or CPAGrip starts.
- [x] Add automatic refresh or polling for pending sessions.
- [x] Add task detail pages for complex CPAGrip and internal tasks.
- [x] Keep mobile task cards compact and move long instructions to detail pages.
- [x] Clearly distinguish delayed provider-verified tasks from admin-reviewed internal tasks.

## Phase 10: Tests and Release Gates

- [x] Fix the current smoke test failure around configured sponsored task rewards.
- [x] Add tests for Adsterra `psid` URL generation.
- [x] Add tests for Adsterra reconciliation matching by `placement_sub_id`.
- [x] Add tests for CPAGrip duplicate postback idempotency.
- [x] Add tests for reward RPC atomic balance and ledger updates.
- [x] Add tests for global cap and daily cap enforcement.
- [x] Add tests that paused, draft, archived, or disabled-platform tasks cannot start.
- [x] Run `npm test`.
- [x] Run `npm run build`.
- [ ] Review logs and provider sandbox/test data before enabling production tasks.

## Latest Verification

- [x] `npm run build` passed on 2026-05-31 after Phase 4, Phase 6, and Phase 7 changes.
- [x] `npm run build` passed on 2026-05-31 after Phase 8 and Phase 9 changes.
- [x] `npm test` passed on 2026-05-31 after updating sponsored-task smoke coverage for the Adsterra/CPAGrip provider flow.
- [x] `npm run build` passed on 2026-05-31 after Phase 9 polling and Phase 10 smoke-test changes.

## Review Questions

- [ ] Should Adsterra rewards require reported revenue, or is a reported click enough at launch?
- [ ] Should existing Monetag task rows be migrated to Adsterra or archived?
- [ ] What daily Adsterra task cap should normal users start with?
- [ ] Should CPAGrip rewards be withdrawable immediately or locked until manual provider reconciliation?
- [ ] Which internal task types should ship first?
