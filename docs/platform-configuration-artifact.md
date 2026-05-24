# Platform Configuration Artifact

This artifact documents how the admin platform tools should be wired across byte-earn.

## Current Admin Platform Surface

- Platform settings: `/admin/platform`
- Email blast creation: `/admin/platform`
- Email blast history: `/admin/email-blasts`
- Badge creation: `/admin/platform`
- Badge gallery/history: `/admin/badges`
- Platform notifications: `/admin/platform`

## Platform Settings Wiring

`platform_settings` should be the single source of truth for global product controls.

| Setting | Intended Runtime Consumer | Behavior |
| --- | --- | --- |
| `post_approval_required` | Upload action, moderation feed | New posts are `pending` when enabled, otherwise `published`. |
| `under_construction` | `proxy.ts` / middleware | Non-admin authenticated users redirect to `/under-construction`; admins bypass. |
| `sponsored_withdrawals_unlocked` | Wallet balance and withdrawal action | Sponsored credits become eligible for withdrawal when enabled. |
| `daily_watch_limit_seconds` | Sponsored task/watch-time recording | Server caps daily watch credit accrual. |
| `leaderboard_strict_mode` | Leaderboard query/scoring | Strict mode requires all enabled criteria. |
| `leaderboard_uses_referrals` | Leaderboard query/scoring | Referral count contributes to rank. |
| `leaderboard_uses_engagement` | Leaderboard query/scoring | Likes/comments contribute to rank. |
| `leaderboard_uses_bookmarks` | Leaderboard query/scoring | Bookmarks contribute to rank. |
| `leaderboard_uses_watch_time` | Leaderboard query/scoring | Watch-time credits contribute to rank. |

## Email Blasts With Gmail

Use Gmail SMTP from server-only environment variables:

```env
GMAIL_SMTP_USER=
GMAIL_SMTP_APP_PASSWORD=
EMAIL_FROM=
```

Recommended implementation:

1. Extend `email_blasts` with delivery fields: `status`, `sent_at`, `failed_at`, `error_message`, `recipient_count`.
2. Save blast drafts from `/admin/platform`.
3. Show blast history in `/admin/email-blasts`.
4. Send email from a server-only route or background job, not from a client component.
5. Batch recipients by audience from `profiles`.
6. Record audit logs for queued, sent, and failed blasts.

## In-App Notifications

Use `platform_notifications` for admin-created announcements.

Recommended additions:

1. Add `notification_reads`:
   - `notification_id`
   - `profile_id`
   - `read_at`
2. Add a notification bell for users and admins.
3. Compute unread counts server-side.
4. Filter notifications by `audience` and user profile status.
5. Allow admins to see all notifications and users to see only matching audience rows.

## Supabase Realtime Notifications

Realtime should be used for notification delivery, not authorization.

Recommended implementation:

1. Enable Realtime for `platform_notifications`.
2. Subscribe in the notification bell client component.
3. On insert, refresh unread count and show a toast.
4. Keep RLS policies as the authority for which rows can be read.
5. For private per-user notifications later, add `profile_notifications` with `profile_id = auth.uid()` RLS.

## Badges

Badges now support image uploads.

Required migration:

- `db/migrations/0009_badge_images.sql`

Runtime requirements:

- Supabase Storage bucket: `badge-images`
- `badges.image_url` stores the public badge image URL
- Badge creation stays admin-only

## Security Notes

- Keep `SUPABASE_SERVICE_ROLE_KEY` server-only. Never prefix it with `NEXT_PUBLIC_`.
- Admin actions must call `requireAdmin()`.
- Admin writes should use the service-role client when available.
- User-facing reads should still respect RLS.
- Realtime events should never be trusted without server/RLS validation.
