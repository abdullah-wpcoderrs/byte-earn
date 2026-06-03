# Sponsored Task Production Gap Analysis

Reviewed on 2026-05-30 against the current implementation, the planning attachment, current public provider documentation, and the follow-up decision to replace Monetag SmartLink with Adsterra SmartLink.

## Sources Checked

- Monetag Direct Link / SmartLink help: https://help.monetag.com/en/articles/6726647-direct-link-smartlink
- Monetag server postback docs for rewarded Telegram Mini App formats: https://docs.monetag.com/docs/postbacks/configuration/
- Monetag postback testing guidance: https://docs.monetag.com/docs/postbacks/testing/
- Adsterra Smart Direct Link guide: https://adsterra.com/blog/guide-for-working-with-direct-links/
- Adsterra Publisher API guide: https://adsterra.com/blog/how-to-use-adsterra-publishers-api/
- Adsterra Smartlink product page: https://adsterra.com/smartlink-ads/
- CPAGrip public Offer Walls page: https://www.cpagrip.com/tools-offer-walls.php
- CPAGrip public Virtual Currency page: https://www.cpagrip.com/tools-virtual-currency.php
- BeMob CPAGrip tracker setup reference: https://docs.bemob.com/en/cpagrip-settings
- CPAlead postback docs were also reviewed as an industry-comparable offerwall reference, but they are not CPAGrip authority: https://www.cpalead.com/en/postback/documentation

## Updated Provider Direction

The production direction is now:

| Provider | Role | Verification model |
| --- | --- | --- |
| Adsterra SmartLink | Recurring monetized outbound ad tasks | Delayed Publisher API reconciliation using `psid` / `placement_sub_id` |
| CPAGrip | Higher-value CPA offer tasks | Server postback confirmation |
| Internal sponsored tasks | Platform/direct advertiser campaigns | Platform-controlled validation per task subtype |

Monetag should be deprecated from the product flow. The current code still contains Monetag-shaped provider values, UI labels, and a callback endpoint, so part of production preparation is to rewire those surfaces to Adsterra.

## Current Implementation Snapshot

Implemented:

- Database tables for `sponsored_tasks` and `task_sessions` in `db/migrations/0033_sponsored_tasks_engine.sql`.
- Provider enum values for `monetag`, `adsterra`, `cpagrip`, and `internal` in `db/schema.ts`; `monetag` is legacy only.
- User task page at `app/(app)/tasks/page.tsx`, gated by `platform_settings.sponsored_tasks_enabled`.
- User task UI grouping for CPAGrip, Adsterra, and internal tasks in `components/tasks/task-engine.tsx`.
- Admin task list and create/edit modal in `app/admin/tasks/page.tsx` and `components/admin/create-task-modal.tsx`.
- Server actions for creating, updating, activating, deleting, starting, and internally completing tasks.
- Hardened CPAGrip callback under `app/api/postback/cpagrip`, deprecated Monetag callback under `app/api/postback/monetag`, and Adsterra reconciliation under `app/api/tasks/reconcile/adsterra`.
- Public media bucket for internal sponsored task media in `db/migrations/0035_sponsored_tasks_media_bucket.sql`.

Not yet production-ready:

- CPAGrip still needs exact dashboard macro confirmation.
- Adsterra SmartLink reconciliation exists, but production endpoint/env values still need to be configured.
- Rewards are not issued atomically with balance updates and idempotency guarantees.
- Internal task completion is client-triggered and can be farmed.
- Global caps, budgets, analytics, fraud controls, and reconciliation tables are missing.
- Admin creation lacks provider-specific validation and production activation checks.

## Critical Gaps

### 1. Sponsored task rewards write ledger rows but do not reliably update `profiles.credits_balance`

Files:

- `app/(app)/tasks/actions.ts`
- `app/api/postback/cpagrip/route.ts`
- `app/api/postback/monetag/route.ts`

The sponsored task code inserts into `credit_ledger`, but unlike referral rewards and admin adjustments, it does not update `profiles.credits_balance` in the same trusted database transaction. Wallet calculations read `credit_ledger`, but admin user tables, leaderboard logic, and other account state still use `profiles.credits_balance`.

Production impact:

- Wallet and admin balance views can diverge.
- A user may appear unpaid in one surface and paid in another.
- Failed ledger inserts after a session is marked completed can silently lose rewards.

Required fix:

- Move sponsored reward issuance into a database RPC such as `complete_sponsored_task_session`.
- In one transaction, lock the task/session/profile rows, verify eligibility, update session status, insert a unique ledger row, update `profiles.credits_balance`, and increment `sponsored_tasks.completions_count`.
- Return the resulting reward and status to the caller.

### 2. Provider callbacks are not idempotent enough for real postback retries

Files:

- `app/api/postback/cpagrip/route.ts`
- `app/api/postback/monetag/route.ts`
- `db/schema.ts`

The current callbacks dedupe only by the local pending session status. Real provider postbacks can be retried, delayed, or sent with provider conversion IDs. CPAGrip tracker guidance references a CPAGrip `tracking_id` and payout tokens, and comparable offerwall docs use a lead or transaction ID for dedupe. Adsterra SmartLink should not use this callback shape; it needs API reconciliation by `placement_sub_id` after the user is redirected with `psid=<session_id>`.

Production impact:

- Duplicate or delayed postbacks cannot be reconciled cleanly.
- You cannot prove which provider conversion funded a user credit.
- Support and finance have no source-of-truth provider event table.

Required fix:

- Add a `provider_postbacks` or `sponsored_task_conversions` table with:
  - `provider`
  - `provider_event_id`
  - `provider_offer_id`
  - `session_id`
  - `profile_id`
  - `task_id`
  - `payout_amount`
  - `currency`
  - `ip_address`
  - `country_code`
  - `raw_payload`
  - `processed_at`
  - `status`
- Add a unique index on `(provider, provider_event_id)` when an event ID exists.
- Add a unique index on completed local session reward ledger metadata.
- Always return provider-compatible success responses for duplicate-but-valid CPAGrip retries.
- Store Adsterra API reconciliation rows separately from CPAGrip postbacks because they are stats pulls, not provider callbacks.

### 3. Adsterra SmartLink still needs production configuration and Monetag should remain deprecated

Files:

- `app/(app)/tasks/actions.ts`
- `app/api/postback/monetag/route.ts`
- `components/tasks/task-engine.tsx`
- `components/admin/create-task-modal.tsx`
- `db/schema.ts`

The implementation now replaces the active SmartLink flow with Adsterra SmartLink. Adsterra documents Smart Direct Link / Direct Link tracking with a `psid` query parameter and Publisher API stats grouped by `placement_sub_id`. That means Adsterra should be treated as delayed, API-reconciled ad traffic rather than an immediate S2S postback task.

Production impact:

- Existing Monetag task rows still need a migration/archive decision.
- Users could be credited incorrectly if Adsterra is wired as an instant completion instead of reconciled traffic.
- Without Adsterra API reconciliation, the platform cannot connect SmartLink revenue back to a task session.

Required fix:

- Keep `monetag` only for legacy rows until a later enum cleanup is safe.
- Migrate or archive existing Monetag tasks and sessions according to the launch policy.
- Change SmartLink tracking from `subid=<session_id>` to `psid=<session_id>` for Adsterra tasks.
- Replace `/api/postback/monetag` with an internal Adsterra reconciliation route or scheduled job.
- Query Adsterra Publisher API with an `X-API-Key` and reconcile stats by `placement_sub_id`.
- Complete Adsterra sessions only through the same trusted reward RPC used for other sponsored rewards.

### 4. Internal sponsored task completion is trusted from the browser

Files:

- `components/tasks/task-engine.tsx`
- `app/(app)/tasks/actions.ts`

The internal task flow marks a task completed after `navigator.share` resolves or after copying text to clipboard. A user can call `completeInternalTask(task.id)` directly without actually posting, keeping the post live, meeting a duration, or proving off-platform engagement.

Production impact:

- Internal campaign budgets can be drained by scripted calls.
- Advertisers receive no reliable proof of share or traffic.
- The platform may pay for tasks with no monetized result.

Required fix:

- Split internal tasks into specific task types with clear validation:
  - `share_link`: reward only after a tracked referral/campaign visit from the generated URL, with cooldown and unique visitor checks.
  - `visit_url`: reward only after server-created session, minimum dwell time, and a completion ping bound to the session token.
  - `watch_media`: reward only through server-side milestone RPCs with daily caps.
  - `manual_review`: submit proof and let admin approve.
- Never reward internal tasks solely from clipboard or share API success.

## High Priority Gaps

### 5. Start task does not verify task status, provider consistency, global caps, or platform toggle

Files:

- `app/(app)/tasks/actions.ts`

`startTask` fetches the task by ID but does not require `status = active`, does not verify the supplied `provider` matches the database task provider, does not check `global_cap`, and does not re-check `sponsored_tasks_enabled`.

Production impact:

- Users can start paused, draft, or archived task IDs if they know them.
- Client-supplied provider can create inconsistent sessions.
- Campaign budgets can be exceeded.

Required fix:

- Fetch by `id`, `status = active`, and provider from the database only.
- Ignore client-supplied provider.
- Block starts when `sponsored_tasks_enabled` is false.
- Enforce `global_cap` before start and again at completion.
- Capture `ip_address`, `user_agent`, and a signed `tracking_token`.

### 6. Daily limits are race-prone and count only completed sessions

Files:

- `app/(app)/tasks/actions.ts`
- `app/api/postback/monetag/route.ts`

The code counts completed sessions before inserting or completing. Parallel clicks or repeated tabs can create many pending sessions and later complete beyond the intended daily cap.

Production impact:

- Users can exceed daily caps with concurrent starts.
- SmartLink progress can be inflated by multiple pending sessions if Adsterra reconciliation completes each one independently.

Required fix:

- Enforce caps inside a database transaction at completion time.
- Add a per-user per-task cooldown.
- Consider a partial unique index or RPC guard for active pending sessions.
- Expire stale pending sessions.

### 7. Admin task creation lacks provider-specific production validation

Files:

- `components/admin/create-task-modal.tsx`
- `app/admin/tasks/actions.ts`

The same model is used for all provider types. There is no validation for required CPAGrip macros, Adsterra placement/domain IDs, allowed domains, payout assumptions, campaign budget, conversion rules, task subtype, or activation readiness.

Production impact:

- Admins can activate malformed tasks.
- Provider URLs can be misconfigured and silently fail.
- Open redirect or phishing-like destinations can be published.

Required fix:

- Add provider-specific fields:
  - CPAGrip: offer URL, tracking parameter name, expected payout, provider offer ID, country/device targeting, postback password configured flag.
  - Adsterra: SmartLink URL, placement ID, domain ID, tracking parameter name defaulting to `psid`, Publisher API reconciliation enabled flag, expected stats grouping `placement_sub_id`.
  - Internal: task subtype, proof requirement, destination URL, campaign budget, per-user cap, global cap.
- Validate URLs server-side with allowlists per provider.
- Require a readiness checklist before activation.

### 8. CPAGrip integration needs confirmed macro mapping

Files:

- `app/(app)/tasks/actions.ts`
- `app/api/postback/cpagrip/route.ts`

The code appends `subid`, but CPAGrip tracker setup references `tracking_id={clickId}` as the manual click ID parameter, and a common CPAGrip postback URL shape is `cid={tracking_id}&payout={payout}`. CPAGrip's public pages confirm offer walls, point rewards, postback tracking, and virtual currency, but detailed macro contracts may require dashboard-specific tokens.

Production impact:

- CPAGrip conversions may not map back to `task_sessions.id`.
- Payout, offer ID, and status may be missing from callbacks.

Required fix:

- Confirm exact CPAGrip offer URL parameter and postback tokens inside the CPAGrip dashboard.
- Store the mapping in configuration rather than hard-coding `subid`.
- Recommended minimum callback fields: local session ID, provider conversion ID, provider offer ID, payout, status, IP, country, and secret/password.

## Medium Priority Gaps

### 9. No analytics model for clicks, starts, conversions, payout, or rejection

The admin dashboard only shows `completions_count`, and the callbacks do not increment it for CPAGrip. There is no reporting for Adsterra impressions/clicks/revenue, CPAGrip conversions, starts, completed conversions, rejected callbacks, effective EPC, conversion rate, or task budget burn.

Required fix:

- Add analytics rollups or queryable event tables:
  - `task_impression`
  - `task_start`
  - `provider_postback_received`
  - `provider_stats_reconciled`
  - `reward_issued`
  - `provider_rejected`
- Add admin analytics pages for task, provider, country, device, and date ranges.

### 10. No fraud controls beyond a simple daily cap

The planning document calls for IP uniqueness, VPN detection, device fingerprinting, cooldowns, duplicate conversion prevention, and referral fraud checks. The implementation stores nullable IP/user agent columns but does not populate or enforce them.

Required fix:

- Populate IP and user agent on start and postback.
- Add velocity rules for starts and completions.
- Add same-IP and same-device limits.
- Add country mismatch checks between start and provider postback.
- Add suspicious status and admin review queue.
- Consider a third-party fraud/VPN signal before enabling cash-withdrawable rewards.

### 11. No audit logs for sponsored task admin actions or reward issuance

Admin task creation, edits, activation, deletion, and provider reward callbacks should be audit logged. This is especially important because sponsored tasks affect balances and campaign spend.

Required fix:

- Write `audit_logs` rows for admin create/update/status/delete.
- Write system audit rows for postback accepted, duplicate ignored, rejected, and reward issued.

### 12. Delete action removes sessions before deleting tasks

File:

- `app/admin/tasks/actions.ts`

`deleteSponsoredTask` deletes task sessions, then deletes the task. This removes historical evidence for conversions and rewards.

Required fix:

- Prefer archival over deletion.
- Keep task sessions and provider postbacks immutable.
- If a task must disappear from users, set `status = archived`.

## Low Priority / UX Gaps

### 13. User feedback depends on alerts and manual refresh

The task UI uses browser alerts and tells SmartLink users to refresh. Production should use in-app status cards, pending states, and polling or realtime updates.

### 14. Mobile and task-type UX need tightening

The page groups by provider, not by user action. A user likely understands "Surveys", "Watch ads", "Share campaigns", or "Visit links" better than provider names. Mobile cards should stay minimal and push details to a task detail page if the task has complex instructions.

### 15. Existing smoke test is failing

`npm test` currently fails on `task rewards are loaded from configured reward rules` because `app/(app)/tasks/page.tsx` no longer references `getConfiguredSponsoredTasks`. This is not directly a provider integration failure, but it is a release blocker until either the test is updated or the implementation is restored to the expected reward-rule contract.

## Recommended Production Work Plan

### Phase 1: Lock Reward Authority

1. Add conversion/postback tables and metadata columns.
2. Add an RPC for sponsored completion and reward issuance.
3. Make reward issuance idempotent and transactional.
4. Update `db/schema.ts` and provide the SQL migration for manual execution.
5. Fix or update the smoke test reward-rule expectation.

### Phase 2: Provider Contracts

1. Confirm CPAGrip tracking URL and postback macros inside the CPAGrip dashboard.
2. Add Adsterra provider configuration and Publisher API reconciliation.
3. Deprecate the Monetag callback route and migrate or archive Monetag provider rows.
4. Add provider configuration fields and server validation.
5. Add test callback fixtures for CPAGrip and stats reconciliation fixtures for Adsterra.

### Phase 3: Abuse Controls

1. Capture IP, user agent, session token, and referrer at task start.
2. Add cooldowns, daily starts cap, pending session expiry, and per-provider velocity rules.
3. Add duplicate conversion prevention by provider event ID.
4. Add suspicious conversion states and admin review.

### Phase 4: Admin and Analytics

1. Add task subtype, campaign budget, global cap, targeting, and readiness status.
2. Add provider analytics and raw postback logs.
3. Add immutable archive behavior instead of hard delete.
4. Add audit logs for admin and system actions.

### Phase 5: User Experience

1. Replace alerts with persistent status UI.
2. Add task detail pages for complex CPAGrip/internal tasks.
3. Add pending verification state after a provider task starts.
4. Add automatic progress refresh or realtime updates.

## Launch Recommendation

Do not enable withdrawable sponsored rewards in production yet.

The admin creation surface and user task page are a good prototype foundation, but production needs the database to become the source of truth for reward completion, balance mutation, provider reconciliation, and budget enforcement. CPAGrip can be productionized once dashboard macro mapping and idempotent postbacks are implemented. Adsterra can replace Monetag only as delayed, API-reconciled SmartLink traffic using `psid` and Publisher API stats grouped by `placement_sub_id`.
