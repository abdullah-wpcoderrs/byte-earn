# Platform Page Gap Analysis

This document reviews the controls linked from `/admin/platform` and separates what is fully working from what still needs implementation.

## What Changed In This Pass

- The `under_construction` switch now serves a middleware-level maintenance page on public routes.
- Admins can still sign in from the construction page and reach `/admin`.
- Archived platform notifications are now filtered out of user trays.

## Status Guide

- `Working`: saved in admin and enforced in runtime behavior.
- `Working with dependency`: the flow works, but it depends on external setup such as SMTP or Storage.
- `Partial`: some parts work, but the behavior is incomplete or misleading.
- `Missing`: the control saves data, but the runtime feature is not implemented.

## Platform Settings Review

| Control | Status | Current behavior | Next step |
| --- | --- | --- | --- |
| Require post approval | Working | New uploads become `pending` when enabled and `published` when disabled. | Keep as-is. |
| Enable sponsored tasks feature | Working | Tasks page and task starts are blocked when disabled. | Keep as-is. |
| Unlock sponsored withdrawals | Working | Wallet availability and withdrawal requests respect the unlock rule. | Keep as-is. |
| Under-construction global switch | Working | Public routes return a maintenance page from middleware; admin access stays on separate admin paths. | Keep as-is and add QA coverage when new public routes are introduced. |
| Max upload size MB | Working | Upload actions reject files above the configured limit. | Keep as-is. |
| Daily watch limit seconds | Working | Internal `watch_media` rewards now aggregate completed watch sessions per day and stop new reward completion once the cap is reached. | Keep as-is and watch for future non-task watch reward paths. |

## Platform Notifications Review

| Control | Status | Current behavior | Next step |
| --- | --- | --- | --- |
| Create notification | Working | Admins can create announcements for `all`, `active`, or `suspended` audiences. | Keep as-is. |
| Notification history list | Working | Existing notifications are visible in admin history. | Keep as-is. |
| Archive notification | Working | Archived notifications no longer appear in user trays. | Keep as-is. |
| Delete notification | Working | Deleted notifications are removed from admin history and user trays. | Keep as-is. |
| Read tracking | Working | `notification_reads` stores per-user read state. | Keep as-is. |
| Realtime delivery | Working | Notification bells now refresh from Supabase Realtime when platform notifications or read-state rows change. | Keep server-side reads as the source of truth when future notification filters are added. |
| Targeted per-user creation from platform page | Working | The platform composer can now send either audience-wide notifications or a targeted single-user notification with server-side recipient validation. | Keep recipient selection scoped to trusted profile ids and extend it later if segment rules expand. |

## Email Blast Review

| Control | Status | Current behavior | Next step |
| --- | --- | --- | --- |
| Create email blast draft | Working | `/admin/platform` saves a draft row in `email_blasts`. | Keep as-is. |
| Email history link | Working | `/admin/email-blasts` opens the draft and send management page. | Keep as-is. |
| Edit draft | Working | Draft and failed blasts can be edited and saved. | Keep as-is. |
| Duplicate draft | Working | Existing blasts can be copied into a new draft. | Keep as-is. |
| Delete draft | Working | Draft and failed blasts can be deleted. | Keep as-is. |
| Send blast | Working with dependency | Delivery works only when Gmail SMTP env vars and admin auth access are configured. | Add a platform health panel that warns when SMTP env vars are missing. |
| Bulk sending model | Working | Delivery is queued, processed in batches, and can resume from the email history page without holding one long request open. | Keep as-is and move to a dedicated worker later if send volume grows. |
| Preview or test-send | Working | Admins can send a preview to themselves or a one-off test copy without affecting blast delivery state. | Keep these utility sends separate from production delivery metrics. |

## Badge Review

| Control | Status | Current behavior | Next step |
| --- | --- | --- | --- |
| View badges link | Working | `/admin/platform` links to `/admin/badges`. | Keep as-is. |
| Create badge | Working with dependency | Badge creation works when the `badge-images` Storage bucket exists. | Add a visible dependency warning when upload storage is missing. |
| Badge gallery | Working | Created badges render on `/admin/badges`. | Keep as-is. |
| Badge assignment | Working | Badges can be assigned and removed from `/admin/users`, and they show on profile surfaces. | Keep as-is. |
| Edit badge | Working | Existing badges can be edited from the badge gallery, including optional image replacement. | Keep badge copy and image updates aligned with assigned surfaces. |
| Delete badge | Working | Badges can be deleted when unassigned, and assigned badges show safeguards that block deletion until usage is removed. | Keep assignment safeguards in place before any future bulk-delete flow. |

## UI And Operational Gaps

| Area | Status | Current behavior | Next step |
| --- | --- | --- | --- |
| Settings impact table accuracy | Working | The daily watch cap row now describes the real enforcement path for internal watch rewards. | Keep copy aligned when new settings are added. |
| Dependency health on platform page | Working | The page now shows readiness checks for service role access, Gmail SMTP, and badge storage. | Keep the check list aligned with future admin-only integrations. |
| Composer workflow | Working | Notification creation now opens in a focused modal, and email drafts use a modal rich text composer with preview and HTML source editing. | Keep future composer actions inside the same modal workflow for consistency. |
| Platform action confirmations | Working | Destructive platform actions now use explicit confirmation prompts before archive or delete submits. | Keep new destructive actions on the same confirmation pattern. |

## Implementation Checklist

Use this as the working checklist for the platform-gap implementation pass. Each phase should be completed, tested, and reviewed before the next one starts.

### Phase 1: Daily Watch Limit Enforcement

- [x] Review the current watch-time recording flow and confirm where `daily_watch_limit_seconds` should be enforced.
- [x] Decide whether the cap applies to post analytics only, reward accrual only, or both.
- [x] Add server-side daily aggregation for user watch-time activity.
- [x] Stop additional reward accrual once the configured daily limit is reached.
- [x] Update the platform impact copy so it reflects the final enforced behavior.
- [x] Add or update tests that prove the cap blocks excess watch-time credit.
- [x] Run `npm run test`, `npm run lint`, and `npm run build`.

### Phase 2: Platform Readiness Panel

- [x] Add a platform readiness section to `/admin/platform`.
- [x] Check Gmail SMTP readiness from server-side config.
- [x] Check badge image storage readiness for the `badge-images` bucket.
- [x] Check service-role readiness for admin-only actions.
- [x] Show pass/fail states and short human-readable guidance for missing dependencies.
- [x] Ensure the readiness panel does not expose secrets or secret values.
- [x] Add or update tests for the readiness data loader where practical.
- [x] Run `npm run test`, `npm run lint`, and `npm run build`.

### Phase 3: Email Blast Delivery Hardening

- [x] Review the current synchronous email blast send path in `sendEmailBlastAction`.
- [x] Choose the background delivery shape to implement first.
- [x] Define how batch progress, retry state, and final status should be stored.
- [x] Refactor blast sending so large sends are no longer tied to one request lifecycle.
- [x] Preserve audit logging for send start, send completion, and send failure.
- [x] Ensure failed sends keep enough metadata for safe retry.
- [x] Add tests for status transitions and failure handling.
- [x] Run `npm run test`, `npm run lint`, and `npm run build`.

### Phase 4: Email Blast Preview And Test Send

- [x] Add a preview-to-self action for email blasts.
- [x] Add a test-audience or single-recipient send path.
- [x] Prevent preview sends from marking a blast as fully sent.
- [x] Add clear admin UI labels so preview and production send actions cannot be confused.
- [x] Audit-log preview and test-send actions separately from full sends.
- [x] Add tests for preview and test-send behavior.
- [x] Run `npm run test`, `npm run lint`, and `npm run build`.

### Phase 5: Badge Editing And Deletion

- [x] Add badge edit UI and server action support.
- [x] Decide whether badge deletion should be hard delete, soft delete, or archive.
- [x] Prevent destructive badge changes from breaking already assigned badge relationships.
- [x] Add usage safeguards so admins can see whether a badge is assigned before removing it.
- [x] Revalidate badge surfaces after edit or delete operations.
- [x] Add tests for badge update and badge removal flows.
- [x] Run `npm run test`, `npm run lint`, and `npm run build`.

### Phase 6: Realtime Notification Refresh

- [x] Review the current notification bell client flow.
- [x] Add Supabase Realtime subscription for new notification inserts.
- [x] Refresh unread counts and visible items when a relevant event arrives.
- [x] Ensure archived or deleted notifications do not reappear in the bell.
- [x] Keep server-side reads as the source of truth for final notification state.
- [x] Add tests or QA notes for realtime notification behavior.
- [x] Run `npm run test`, `npm run lint`, and `npm run build`.

### Phase 7: Targeted Admin Notifications

- [x] Decide whether targeted notifications belong in `/admin/platform` or a separate admin tool.
- [x] Add admin UI for selecting a single recipient or a defined recipient group.
- [x] Validate targeted recipient IDs server-side.
- [x] Ensure targeted notifications coexist cleanly with audience-wide notifications.
- [x] Confirm notification reads and history still work for targeted rows.
- [x] Add tests for targeted notification creation and delivery.
- [x] Run `npm run test`, `npm run lint`, and `npm run build`.

### Phase 8: Platform UX Accuracy And Safety Sweep

- [x] Audit the settings impact table for any copy that overstates what a control actually does.
- [x] Add explicit confirmation UX for destructive admin actions such as notification delete.
- [x] Review platform-page buttons, toggles, and forms after the earlier phases land.
- [x] Update docs so runtime behavior, admin labels, and implementation status stay aligned.
- [x] Run a final regression pass across `/admin/platform`, `/admin/email-blasts`, `/admin/badges`, and the notification bell.
- [x] Run `npm run test`, `npm run lint`, and `npm run build`.

## Review Notes

- Phase 1 should be first because it closes the only platform setting that is clearly saved but not enforced.
- Phases 3 and 4 should stay adjacent because preview and test-send design depends on the final blast delivery model.
- Phases 5 through 7 are good standalone work items once the platform readiness panel is in place.
- Phase 8 should be treated as the final alignment pass after the missing feature work lands.

## Useful File References

- [app/admin/platform/page.tsx](C:/Users/Abdullah.Ajibowu/Documents/earnie.ai/byte-earn/app/admin/platform/page.tsx)
- [app/admin/actions.ts](C:/Users/Abdullah.Ajibowu/Documents/earnie.ai/byte-earn/app/admin/actions.ts)
- [app/admin-login/page.tsx](C:/Users/Abdullah.Ajibowu/Documents/earnie.ai/byte-earn/app/admin-login/page.tsx)
- [lib/under-construction-response.ts](C:/Users/Abdullah.Ajibowu/Documents/earnie.ai/byte-earn/lib/under-construction-response.ts)
- [lib/supabase/middleware.ts](C:/Users/Abdullah.Ajibowu/Documents/earnie.ai/byte-earn/lib/supabase/middleware.ts)
- [lib/notifications.ts](C:/Users/Abdullah.Ajibowu/Documents/earnie.ai/byte-earn/lib/notifications.ts)
