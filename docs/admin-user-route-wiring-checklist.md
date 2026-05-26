# Admin and User Route Wiring Checklist

Use this checklist with `docs/admin-user-route-wiring-plan.md`. Mark items complete only after the implementation is wired, verified, and the user-facing/admin-facing effect is clear.

## Progress Legend

- [x] Done and locally verified where possible.
- [ ] Not started or still pending.
- [ ] Blocked items should include the blocker in parentheses.

## Phase 0: Completed Review Fixes

- [x] Rework post upload modal so it opens centered on desktop.
- [x] Close post upload modal after successful submit redirect.
- [x] Add post type conditional fields for image, video, and image plus audio posts.
- [x] Enforce admin-configured max upload size in post upload server action.
- [x] Add platform max upload size setting.
- [x] Add toast messages for upload size and media validation failures.
- [x] Add published, pending, and saved/bookmarked tabs to profile posts.
- [x] Move profile posts out of the nested confined container layout.
- [x] Make mobile notification tray fit the viewport.
- [x] Harden post moderation so only pending posts can be approved or rejected.
- [x] Add targeted post rejection notifications.
- [x] Make audit logging tolerant when the audit table is missing.
- [x] Add audit log repair migration.
- [x] Add `/admin/audit` route.
- [x] Add transaction history tab to `/admin/withdrawals`.
- [x] Make admin sidebar scrollable.

## Phase 1: Migration Readiness

- [x] Add `SUPABASE_POSTGRES_URL` to `.env`.
- [x] Run `npx drizzle-kit migrate`. (completed manually through Supabase SQL Editor)
- [x] Verify `audit_logs` exists.
- [x] Verify `platform_notifications.recipient_profile_id` exists.
- [x] Verify `platform_settings.max_upload_size_mb` exists.
- [x] Verify post media storage bucket limits are updated.
- [x] Confirm platform save no longer fails with schema-cache errors.
- [x] Confirm rejected post notifications appear only for the post author.
- [x] Confirm direct user writes cannot bypass post approval.

## Phase 2: Toast Coverage and Form UX

- [x] Preserve toast visibility after URL cleanup.
- [x] Add platform settings save toast handling.
- [x] Add withdrawal review toast handling.
- [x] Add moderation action toast handling.
- [x] Audit every admin action redirect for missing success/error toast copy.
- [x] Add pending/disabled submit states to admin mutation forms.
- [x] Confirm modal create/edit flows close or redirect cleanly after success.
- [x] Cover `createAdminUserAction`.
- [x] Cover `bulkUserAction`.
- [x] Cover `moderatePostAction`.
- [x] Cover `reviewWithdrawalAction`.
- [x] Cover `updateLeaderboardSettingsAction`.
- [x] Cover `updatePlatformSettingsAction`.
- [x] Cover `updateRewardRuleAction`.
- [x] Cover `updateFinanceSettingsAction`.
- [x] Cover `createNotificationAction`.
- [x] Cover `createEmailBlastAction`.
- [x] Cover `sendEmailBlastAction`.
- [x] Cover `createBadgeAction`.

## Phase 3: Badges End-to-End

- [x] Add `profile_badges` join table.
- [x] Add badge assignment migration and RLS policies.
- [x] Add assign/remove badge server actions.
- [x] Add assign/remove badge controls on admin user detail modal.
- [x] Show current user badges in admin.
- [x] Display assigned badges on own profile header.
- [x] Display assigned badges on public profile header.
- [x] Add compact badge indicators to feed cards where useful.
- [x] Add badge CRUD and assignment toast messages.
- [x] Verify assign/remove persists after refresh.

## Phase 4A: Admin-Created Daily Sponsored Tasks

- [ ] Review existing tasks schema, route loader, reward rules, and client milestone code.
- [ ] Add or extend sponsored task table for `admin_daily` source.
- [ ] Add task media storage bucket or reuse a suitable existing bucket safely.
- [ ] Add admin task CRUD server actions.
- [ ] Add task create/edit form with media type, media upload, caption/title, sponsor, active window, and status.
- [ ] Add admin task list filters for active, draft, paused, and archived.
- [ ] Add task preview matching the user route appearance.
- [ ] Add server action for task milestone completion.
- [ ] Validate task id, source, active window, milestone seconds, daily cap, and duplicate awards server-side.
- [ ] Write `task_progress` rows.
- [ ] Write `credit_ledger` rows.
- [ ] Use reward rules for `sponsored_task_milestone` and `watch_time_milestone`.
- [ ] Revalidate `/tasks`, `/wallet`, `/admin`, and admin task pages after mutations.
- [ ] Restructure user `/tasks` into source-aware sections.
- [ ] Load active daily sponsored tasks from the server.
- [ ] Replace local-only milestone awards with server action calls.
- [ ] Keep optimistic milestone feedback and reconcile with server response.
- [ ] Preserve completed milestones after refresh.
- [ ] Add toasts for create, update, activate, pause, archive, delete, and upload failures.
- [ ] Verify active admin-created task appears on `/tasks` for users on the same day.
- [ ] Verify draft, paused, and archived tasks do not show on user routes.
- [ ] Verify wallet reflects task/watch-time credits.
- [ ] Verify daily cap cannot be bypassed from the client.

## Phase 4B: Incentive Ad-Network Tasks Architecture

- [ ] Add `source` handling that distinguishes `admin_daily` from `incentive_ads`.
- [ ] Add placeholder user route section for incentive ads.
- [ ] Add platform settings placeholders for daily ad view cap.
- [ ] Add platform settings placeholders for click-through cap.
- [ ] Add platform settings placeholders for cooldown window.
- [ ] Add platform settings placeholders for minimum watch duration.
- [ ] Add platform settings placeholders for reward rule mapping.
- [ ] Document pending research items for ad platform integration.
- [ ] Keep live ad-network integration explicitly out of scope for this phase.

## Phase 5: Notifications Management

- [x] Add admin notification history/list.
- [x] Add archive notification action.
- [x] Add delete notification action.
- [ ] Optionally add targeted notification creation by user or segment.
- [x] Hide archived/deleted notifications from user trays.
- [x] Add toast messages for notification CRUD actions.

## Phase 6: Email Blast CRUD

- [x] Add edit draft action.
- [x] Add delete draft/failed action.
- [x] Add duplicate/resend action for sent campaigns if needed.
- [x] Add send confirmation for large recipient counts.
- [x] Keep sent campaigns immutable unless duplicated.
- [x] Add toast messages for email CRUD actions.

## Phase 7: Admin Settings Status Panel

- [x] Add compact status panel to `/admin/platform`.
- [x] Show Post approval impact: upload, feed, profile, moderation.
- [x] Show Max upload size impact: upload modal and upload page.
- [x] Show Sponsored withdrawals impact: wallet and withdrawals.
- [x] Show Under construction impact: protected user routes.
- [x] Show Daily watch cap impact: tasks and wallet rewards.
- [x] Keep helper copy operational and compact.

## Phase 8: Verification Gates

- [x] Run `npm run build` after the latest admin audit/withdrawals/sidebar changes.
- [x] Run `npm run test` after the latest admin audit/withdrawals/sidebar changes.
- [x] Fix existing lint error in `app/admin/rewards/reward-controls.tsx`.
- [x] Run `npm run lint` with a clean result.
- [ ] Manually verify platform settings save.
- [ ] Manually verify pending post moderation.
- [ ] Manually verify withdrawal request review and transaction history.
- [ ] Manually verify audit log screen with real audit rows.
- [ ] Manually verify post upload approval on/off.
- [ ] Manually verify profile post tabs.
- [ ] Manually verify targeted rejection notification.
- [ ] Manually verify sponsored task credit earning after server wiring.
- [ ] Manually verify badge assignment after badge implementation.
