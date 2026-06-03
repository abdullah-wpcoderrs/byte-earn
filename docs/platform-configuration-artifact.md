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
| `under_construction` | `proxy.ts` / middleware | Public requests are intercepted by middleware and return a maintenance page; admin paths stay separate. |
| `sponsored_withdrawals_unlocked` | Wallet balance and withdrawal action | Sponsored credits become eligible for withdrawal when enabled. |
| `daily_watch_limit_seconds` | Sponsored task/watch-time recording | Intended watch-time cap; runtime enforcement is still pending. |
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

1. `email_blasts` has delivery fields: `status`, `sent_at`, `failed_at`, `error_message`, `recipient_count`.
2. Blast drafts are saved from `/admin/platform`.
3. Blast history is shown in `/admin/email-blasts`.
4. Sending is server-only through Gmail SMTP.
5. Recipients are resolved from Supabase Auth users and filtered by `profiles.status`.
6. Audit logs are recorded for created and sent blasts.

## In-App Notifications

Use `platform_notifications` for admin-created announcements.

Recommended additions:

1. `notification_reads` tracks:
   - `notification_id`
   - `profile_id`
   - `read_at`
2. A notification bell is available for users and admins.
3. Unread counts are computed server-side.
4. Notifications are filtered by `audience` and user profile status.
5. Users can mark notifications as read.

## Supabase Realtime Notifications

Realtime should be used for notification delivery, not authorization.

Recommended implementation:

1. Realtime is enabled for `platform_notifications` in migration `0010_email_notifications.sql`.
2. The notification bell subscribes in a client component.
3. On insert, the UI refreshes unread count/list.
4. RLS policies remain the authority for which rows can be read.
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
