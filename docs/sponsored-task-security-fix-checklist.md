# Sponsored Task Security Fix Checklist

This checklist covers the implementation work needed to close the confirmed sponsored-task point-farming loopholes before production.

## Phase 1: Lock Down Reward Authority

- [x] Create a new SQL migration that revokes direct authenticated access to `complete_sponsored_task_session`.
- [x] Keep `complete_sponsored_task_session` executable only by `service_role` and trusted database/server flows.
- [x] Remove or replace broad authenticated `task_sessions` insert/update policies.
- [x] Route user-started session writes through trusted server actions that create only valid pending rows for the authenticated user.
- [x] Ensure users cannot directly change `task_sessions.status`, `created_at`, `completed_at`, `reward_credits`, `provider_event_id`, or `pending_expires_at`.
- [x] Keep admin access intact through existing admin-only policies or server actions.
- [x] Update `db/schema.ts` comments or contract notes if policy behavior changes.

## Phase 2: Fix Internal Watch Task Lifecycle

- [x] Change watch tasks to use `startTask(taskId)` to create a pending session with database-controlled `created_at`.
- [x] Replace `completeInternalWatchTask(taskId, watchedSeconds)` with `completeInternalWatchTask(sessionId)`.
- [x] Fetch the pending session by `id`, `profile_id = auth.uid()`, and `status = pending`.
- [x] Verify the joined task is `provider = internal`, `task_type = watch_media`, and `status = active`.
- [x] Require at least 30 seconds elapsed from the session `created_at` timestamp before reward completion.
- [x] Reject expired pending watch sessions.
- [x] Remove trust in client-supplied `watchedSeconds` for reward eligibility.
- [x] Update task UI flow so playback starts from a server-created session and completes only after the milestone delay.

## Phase 3: Harden Visit Task Completion

- [x] Re-check visit completion after the reward RPC lock-down to ensure the action still has a trusted path to complete valid sessions.
- [x] Validate `pending_expires_at` before completing visits.
- [x] Ensure visit tasks cannot be completed through direct RPC calls or direct row updates.
- [x] Add clear errors for too-early, expired, missing, or already-processed sessions.

## Phase 4: Validate CPAGrip Campaign and Session Binding

- [x] Update CPAGrip postback lookup to require `session.provider = cpagrip`.
- [x] Join or fetch the related `sponsored_tasks` row before rewarding.
- [x] Require approved conversions to include a provider event ID.
- [x] Compare incoming `offer_id` or `campaign_id` against `sponsored_tasks.provider_placement_id`.
- [x] Mark mismatched campaigns as `suspicious` or `rejected` instead of rewarding.
- [x] Store `provider_offer_id`, payout, raw payload, and processed status consistently for all outcomes.
- [x] Add audit log metadata for campaign mismatches and missing event IDs.

## Phase 5: Add Provider IP and Country Fraud Checks

- [x] Capture CPAGrip conversion IP and country from the configured provider macros.
- [x] Store conversion IP and country in `sponsored_task_provider_events.ip_address` and `country_code`.
- [x] Add start-country storage to `task_sessions` or a related fraud metadata field if reliable server-side geo lookup is available.
- [x] Compare start country against provider-reported conversion country.
- [x] Compare start IP against conversion IP using a conservative block or ASN rule where available.
- [x] Route country mismatch or high-risk IP mismatch sessions to `suspicious` status and admin review.
- [x] Extend Adsterra reconciliation parsing if Adsterra stats provide country, geo, or IP-like fields.
- [x] Keep same-IP velocity checks as an additional signal, not the only fraud control.

## Phase 6: Normalize Trusted Client IP Handling

- [x] Replace duplicate local `getClientIp` helpers with one trusted server helper.
- [x] Prefer deployment-provided trusted headers over user-controlled `x-forwarded-for`.
- [x] Document which production proxy/header is authoritative.
- [x] Use the same IP helper for task starts, internal completion rate limits, provider fraud checks, and admin audit metadata.
- [x] Avoid using raw client-controlled IP headers as the only abuse-prevention key.

## Phase 7: Database Migration Package

- [x] Add a new migration file under `db/migrations`.
- [x] Include `REVOKE EXECUTE` for unsafe public/authenticated RPC access.
- [x] Include policy drops and replacement policies for `task_sessions`.
- [x] Add any new columns needed for start country, conversion country, conversion IP, or fraud metadata.
- [x] Add indexes for new fraud-review lookup fields if they are queried in admin screens.
- [x] Manually update `db/schema.ts` for any new columns or indexes.
- [x] Provide the SQL migration file path for manual production execution.

## Phase 8: Tests and Verification

- [x] Add smoke tests proving authenticated users cannot call the reward RPC directly.
- [x] Add tests proving authenticated users cannot mutate protected `task_sessions` lifecycle fields.
- [x] Add tests for watch completion before 30 seconds, after 30 seconds, expired pending session, and wrong user session.
- [x] Add tests for CPAGrip campaign mismatch, missing event ID, duplicate event ID, rejected status, and valid reward.
- [x] Add tests for provider country mismatch routing to `suspicious`.
- [x] Run diagnostics after implementation.
- [x] Run `npm run build` because these fixes touch integrated app behavior.

## Phase 9: Admin Review and UX Alignment

- [x] Ensure suspicious provider sessions appear in the admin task review queue with reason metadata.
- [x] Show watch/visit pending states consistently in the user task UI.
- [x] Keep user-facing messages generic enough to avoid teaching attackers the exact fraud rules.
- [x] Ensure rejected, suspicious, pending, and completed states behave the same in UI, server actions, and database rules.

## Recommended Implementation Order

1. Lock down the reward RPC and `task_sessions` policies.
2. Rework internal watch completion around server-created pending sessions.
3. Patch CPAGrip provider/session/campaign validation.
4. Add provider IP/country capture and suspicious routing.
5. Normalize trusted IP extraction.
6. Add tests and run production build.
