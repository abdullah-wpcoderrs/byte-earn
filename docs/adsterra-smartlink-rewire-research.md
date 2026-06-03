# Adsterra SmartLink Rewire Research

Reviewed on 2026-05-30 as a replacement path for the current Monetag SmartLink implementation.

## Sources Checked

- Adsterra Smart Direct Link guide: https://adsterra.com/blog/guide-for-working-with-direct-links/
- Adsterra Publisher API guide: https://adsterra.com/blog/how-to-use-adsterra-publishers-api/
- Adsterra publisher dashboard/API overview: https://adsterra.com/blog/set-up-publishers-dashboard/
- Adsterra Smartlink product page: https://adsterra.com/smartlink-ads/
- Adsterra CPA/postback article for affiliate-side context: https://adsterra.com/blog/easy-to-join-cpa-network/

## Research Summary

Adsterra SmartLink is branded as Smart Direct Link or Direct Link. It is a publisher monetization URL that redirects users to relevant advertiser landing pages. Adsterra states that Direct Link and SmartLink are the same product, and the publisher flow is:

1. Create a SmartLink / Direct Link in the publisher dashboard.
2. Wait until the link status is active.
3. Place the URL behind a button, image, text link, app surface, or social traffic bridge page.
4. Earn from ad views and/or conversions depending on traffic quality and advertiser campaign matching.

The important implementation detail is the Publisher API `placement_sub_id` support. Adsterra documents adding a unique Sub ID to a SmartLink URL with the `psid` query parameter:

```text
https://adsterra-smartlink.example/path?psid=session_or_campaign_id
```

The Publisher API can then retrieve stats grouped by that `placement_sub_id`, including clicks, impressions, CTR, CPM, and revenue by date. The API base shown in Adsterra examples is:

```text
https://api3.adsterratools.com/publisher
```

Requests require an `X-API-Key` header generated from the publisher account.

## Key Difference From CPAGrip

Adsterra SmartLink is not equivalent to a CPAGrip offerwall postback flow.

CPAGrip should remain postback-confirmed because it is conversion-task oriented. Adsterra SmartLink should be treated as monetized outbound traffic where the platform reconciles click/revenue stats later through the Adsterra Publisher API.

Adsterra has CPA/postback material, but that is primarily affiliate/campaign tracking context and not the same thing as a publisher SmartLink callback that notifies this app when a user has completed a task.

## Can We Replace Monetag With Adsterra?

Yes, but not as a simple callback endpoint swap.

The current Monetag-shaped implementation assumes:

- User starts a task.
- App appends `subid=session_id`.
- Provider sends `/api/postback/monetag`.
- App marks the session complete and eventually pays the reward.

The safer Adsterra shape should be:

- User starts a task.
- App creates a pending `task_sessions` row.
- App appends `psid=<task_sessions.id>` to the Adsterra SmartLink URL.
- User is redirected to Adsterra.
- App stores local click/start metadata immediately.
- A reconciliation job polls Adsterra Publisher API stats grouped by `placement_sub_id`.
- If Adsterra reports valid click/revenue for that `psid`, the app completes the session through a trusted database RPC.
- Credits are issued only through the same idempotent reward path used by other sponsored tasks.

## Recommended Implementation Changes

### Database

Add `adsterra` to the task provider contract. Because Postgres enums cannot simply drop old enum values in-place, use a migration that:

1. Adds `adsterra` to `task_provider`.
2. Migrates existing `monetag` tasks and sessions to `adsterra` if the platform wants a direct replacement.
3. Leaves `monetag` in the enum for historical rows unless a later rebuild migration is planned.

Add provider metadata fields or a JSON config table for:

- `provider_placement_id`
- `provider_domain_id`
- `provider_tracking_param`, default `psid`
- `provider_api_grouping`, default `placement_sub_id`
- `provider_status`, such as `needs_api_reconciliation`

Add a reconciliation table:

- `provider`
- `session_id`
- `task_id`
- `profile_id`
- `placement_sub_id`
- `reported_clicks`
- `reported_impressions`
- `reported_revenue`
- `reported_currency`
- `stats_date`
- `raw_payload`
- `processed_at`
- `status`

### Server Actions

Update `startTask` so:

- It ignores client-supplied provider.
- It fetches an active task and uses the provider stored in the database.
- It blocks starts when `sponsored_tasks_enabled` is false.
- For `adsterra`, it appends `psid=<session_id>` instead of `subid=<session_id>`.
- It captures IP, user agent, and pending-session expiry metadata.

### API / Jobs

Replace `/api/postback/monetag` with an Adsterra stats reconciliation route or scheduled job:

```text
POST /api/tasks/reconcile/adsterra
```

This should be protected by an internal cron secret and should:

1. Pull pending Adsterra sessions for the relevant date window.
2. Query Adsterra Publisher API stats for the placement/date and group by `placement_sub_id`.
3. Match stats rows back to `task_sessions.id`.
4. Complete qualifying sessions through the same trusted reward RPC used by CPAGrip/internal tasks.

### Admin UI

Replace Monetag labels with Adsterra labels:

- Provider option: `Adsterra SmartLink Task`
- Default daily cap: keep conservative, such as 5-10.
- Required task URL: active Adsterra SmartLink URL.
- Required provider fields: domain ID, placement ID, and API reconciliation enabled.

Admin activation should fail until:

- Task URL is an Adsterra SmartLink URL or an approved redirect domain.
- API key exists in environment.
- Placement/domain IDs are configured.
- Reward amount and cap are inside admin reward-rule limits.

### Rewards

Do not reward immediately on redirect.

Use one of these policies:

- Conservative: reward only when API reports revenue for that `psid`.
- Balanced: reward when API reports a valid click for that `psid`, but cap rewards by daily budget and reconcile revenue separately.
- Experimental: require a minimum local dwell time plus API click confirmation.

For production, start with conservative or balanced, with sponsored withdrawals locked until real revenue is reconciled.

## Environment Variables

Recommended:

```text
ADSTERRA_API_KEY=
ADSTERRA_RECONCILE_SECRET=
```

Optional if tasks do not store IDs directly:

```text
ADSTERRA_DEFAULT_DOMAIN_ID=
ADSTERRA_DEFAULT_PLACEMENT_ID=
```

## Production Recommendation

Adsterra is a better fit than Monetag for this repo only if we treat SmartLink tasks as delayed, API-reconciled ad traffic.

It should not be implemented as a fake S2S postback unless Adsterra support confirms a publisher SmartLink postback feature for the exact account and placement. The documented `psid` plus Publisher API path is enough to track per-session performance, but it implies pending verification, delayed rewards, and a reconciliation job rather than immediate completion.

## Rewire Checklist

1. Add `adsterra` provider support in schema, types, admin UI, and user UI.
2. Migrate or archive existing `monetag` tasks.
3. Change SmartLink tracking from `subid` to `psid`.
4. Remove or deprecate `/api/postback/monetag`.
5. Add Adsterra API reconciliation with cron/internal secret protection.
6. Complete sessions only through a transactional reward RPC.
7. Add admin analytics for Adsterra clicks, revenue, and pending sessions.
8. Keep CPAGrip as the postback-confirmed CPA task provider.
