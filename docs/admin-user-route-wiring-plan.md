# Admin and User Route Wiring Plan

## Goal

Finish the admin-to-user feature wiring so every admin control has a clear user-facing effect, safe server enforcement, and visible toast feedback for create, update, delete, and review actions.

Tracking checklist: `docs/admin-user-route-wiring-checklist.md`

## Current Baseline

- Admin settings save redirects now surface toast messages through the shared toast viewport.
- Post upload approval and max upload size are server-enforced from platform settings.
- Moderation defaults to pending posts and only allows pending posts to be published or rejected.
- Targeted moderation notifications are modeled in the database and notification loader.
- Pending migrations still need to be applied to the database once `SUPABASE_POSTGRES_URL` is configured.

## Phase 1: Migration Readiness

Files:
- `db/migrations/0014_admin_moderation_hardening.sql`
- `db/migrations/0015_platform_upload_limit.sql`
- `db/migrations/0016_audit_log_repair.sql`
- `.env`

Tasks:
- Add `SUPABASE_POSTGRES_URL` to `.env`.
- Run `npx drizzle-kit migrate`.
- Verify `audit_logs`, `platform_notifications.recipient_profile_id`, and `platform_settings.max_upload_size_mb` exist.
- Confirm storage bucket limits are updated to the platform ceiling.

Acceptance checks:
- Admin platform save works without schema-cache errors.
- Rejected post notification appears only for the post author.
- Direct user writes cannot bypass post approval.

## Phase 2: Toast Coverage and Form UX

Files:
- `components/ui/toast-viewport.tsx`
- `app/admin/actions.ts`
- Admin pages under `app/admin/**`

Tasks:
- Confirm every admin redirect has toast copy for both success and expected errors.
- Add pending/disabled submit states to admin forms that perform mutations.
- Ensure modal-based create/edit flows visibly close or redirect cleanly after success.

Actions to cover:
- `createAdminUserAction`
- `bulkUserAction`
- `moderatePostAction`
- `reviewWithdrawalAction`
- `updateLeaderboardSettingsAction`
- `updatePlatformSettingsAction`
- `updateRewardRuleAction`
- `updateFinanceSettingsAction`
- `createNotificationAction`
- `createEmailBlastAction`
- `sendEmailBlastAction`
- `createBadgeAction`

Acceptance checks:
- Each admin CRUD/review action produces a success or warning toast.
- URL cleanup does not hide toasts prematurely.
- No form appears idle while a long server action is submitting.

## Phase 3: Badges End-to-End

Problem:
Badges can be created, but they are not assigned to users and do not appear in user-facing profile/feed surfaces.

Proposed data model:
- Add `profile_badges` join table with `profile_id`, `badge_id`, `assigned_by`, `created_at`.

Admin tasks:
- Add assign/remove badge controls on user detail modal.
- Add badge assignment history or at least current badge list.

User-facing tasks:
- Display assigned badges on profile header.
- Display compact badge indicators on feed cards and public profiles where useful.

Acceptance checks:
- Admin can assign and remove badges from a user.
- Assigned badges appear on the user profile and public user page.
- Badge CRUD/assignment actions show toasts.

## Phase 4: Sponsored Tasks and Rewards Server Wiring

Problem:
Sponsored task milestones currently award credits only in client state. They do not persist progress or ledger entries. The tasks route also needs to support two task sources:

- Admin-created daily sponsored tasks: created inside the admin route and shown to users for the selected active day.
- Incentive ad-network tasks: external ad/incentive inventory that users can watch later, with admin-controlled caps and calibration settings. This source is deferred for implementation, but the route/data architecture should leave space for it.

### Phase 4A: Admin-Created Daily Sponsored Tasks

Server tasks:
- Add admin CRUD for sponsored tasks.
- Admin task creation should feel like post creation:
  - select media type: video or image
  - upload media
  - add caption/title
  - set sponsor name
  - set active date or active day window
  - set status: draft, active, paused, archived
- Persist task media through storage buckets or a dedicated task-media bucket.
- Create or extend a sponsored task table shape that supports:
  - `source`: `admin_daily` now, `incentive_ads` later
  - `media_type`: image or video
  - `media_url`
  - `caption`
  - `sponsor_name`
  - `active_from`
  - `active_until`
  - `daily_cap_seconds`
  - `reward_rule_id` or reward action mapping
  - status lifecycle
- Add server action for milestone completion.
- Validate task id, source, active window, milestone seconds, daily cap, and duplicate awards server-side.
- Write `task_progress` and `credit_ledger` rows.
- Use reward rules for `sponsored_task_milestone` and `watch_time_milestone`.
- Revalidate `/tasks`, `/wallet`, `/admin`, and the relevant admin task route after mutations.

Client tasks:
- Restructure the user `/tasks` route into source-aware sections:
  - Daily sponsored tasks: admin-created tasks active for today.
  - Incentive ads: placeholder/empty architecture for later.
- Replace hardcoded/local sponsored task data with server-loaded active tasks.
- Show admin-created tasks immediately on the user route after an admin publishes or activates them.
- Replace local-only milestone awarding with server action calls.
- Keep optimistic feedback, then reconcile with server response.
- Preserve completed milestones after refresh by reading persisted `task_progress`.

Admin route tasks:
- Add `/admin/tasks` or a tasks section under the existing admin navigation.
- Add task list filters: active, draft, paused, archived.
- Add create/edit modal or page using the same restrained media-upload pattern as post creation.
- Add toasts for create, update, activate, pause, archive, delete, and upload failures.
- Show a compact preview of how the task will appear to users.

Acceptance checks:
- Admin can create a daily sponsored task with media and caption.
- Once active, the task appears on `/tasks` for users on the same day.
- Refreshing the tasks page preserves earned progress.
- Wallet reflects task/watch-time credits.
- Daily cap cannot be bypassed by client manipulation.
- Draft/paused/archived tasks do not show on user routes.
- Admin task CRUD actions produce clear success or warning toasts.

### Phase 4B: Incentive Ad-Network Tasks (Architecture Only For Now)

Problem:
Incentive ads will come from an external advertiser or incentive platform. Users should eventually see a separate list of available ad tasks with daily caps, click-through caps, and calibration settings controlled by admin.

Deferred implementation tasks:
- Research candidate incentive ad platforms and integration models.
- Decide whether inventory is pulled server-side, synced on a schedule, or proxied per user request.
- Define an `incentive_ads` source contract without building the live integration yet.
- Add platform settings placeholders for:
  - daily incentive ad view cap
  - click-through cap
  - cooldown window
  - minimum watch duration
  - reward rule mapping
  - fraud/duplicate prevention strategy
- Keep user `/tasks` route architecture source-aware so incentive ads can be added without rewriting the daily sponsored task flow.

Acceptance checks for the placeholder:
- The task data model and route loader can distinguish `admin_daily` from `incentive_ads`.
- The user route can render an empty incentive ads section without breaking.
- The admin plan clearly marks incentive ad integration as pending research, not live functionality.

## Phase 5: Notifications Management

Problem:
Admins can create platform notifications, and users can read them, but admins cannot manage them afterward.

Tasks:
- Add notification history/admin list.
- Add archive/delete action.
- Optionally add targeted notification creation by user or segment.

Acceptance checks:
- Admin can archive/delete a notification.
- Archived/deleted notifications disappear from user trays.
- Actions show toasts.

## Phase 6: Email Blast CRUD

Problem:
Email blasts can be created and sent, but there is no edit/delete/cancel/resend workflow.

Tasks:
- Add edit draft action.
- Add delete draft/failed action.
- Add duplicate/resend action for sent campaigns if needed.
- Add send confirmation for large recipient counts.

Acceptance checks:
- Drafts can be edited before sending.
- Drafts/failed campaigns can be deleted.
- Sent campaigns remain immutable unless explicitly duplicated.
- Actions show toasts.

## Phase 7: Admin Settings Audit

Tasks:
- Add a compact status panel to `/admin/platform` showing which user routes each setting affects:
  - Post approval -> upload/feed/profile/moderation
  - Max upload size -> upload modal and upload page
  - Sponsored withdrawals -> wallet
  - Under construction -> protected user routes
  - Daily watch cap -> tasks
- Add inline helper copy that is operational, not marketing-style.

Acceptance checks:
- Admins can see the effect of each setting before saving.
- Settings page remains dense and uncluttered.

## Recommended Implementation Order

1. Apply pending migrations and verify schema.
2. Fix the existing rewards lint error so lint can be used as a clean gate.
3. Implement badge assignment end-to-end.
4. Implement server-side sponsored task reward persistence.
5. Add notification management.
6. Add email blast edit/delete flows.
7. Add platform settings status panel.

## Verification Checklist

- `npm run build`
- `npm run test`
- `npm run lint`
- Manual admin flow:
  - Save platform settings
  - Create/edit rewards
  - Moderate a pending post
  - Review a withdrawal
  - Create notification
  - Create/send email blast
  - Create and assign badge
- Manual user flow:
  - Upload post under approval on/off
  - See published/pending profile tabs
  - Receive targeted rejection notification
  - Earn task credits after milestone
  - See assigned badges
  - Request withdrawal with sponsored setting on/off
