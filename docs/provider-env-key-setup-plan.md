# Provider Env Key Setup Plan

Use this guide when collecting production values for CPAGrip and Adsterra sponsored tasks.

## Current Env Contract

The app currently expects these provider variables:

```env
CPAGRIP_POSTBACK_SECRET=
ADSTERRA_API_KEY=
ADSTERRA_RECONCILE_SECRET=
ADSTERRA_STATS_ENDPOINT=
```

Keep these values server-only. Do not prefix them with `NEXT_PUBLIC_`.

## Adsterra Setup

Sources reviewed:

- Adsterra Publisher API guide: https://adsterra.com/blog/how-to-use-adsterra-publishers-api/
- Adsterra Direct Link / Smart Direct Link guide: https://adsterra.com/blog/guide-for-working-with-direct-links/

Adsterra calls Direct Link and Smart Direct Link the same product. The app should use the Adsterra SmartLink URL as the task URL, append `psid=<task_session_id>` at runtime, and later reconcile stats from the Publisher API grouped by `placement_sub_id`.

### Values To Collect

| Value | Where to get it | App usage |
| --- | --- | --- |
| Publisher API token | Adsterra publisher dashboard API page, using Generate New Token | `ADSTERRA_API_KEY` |
| SmartLink / Direct Link URL | SmartLinks or Direct Link section after the placement is Active | Admin task `task_url` |
| Domain ID | Publisher API/domain stats URL or dashboard domain record | Admin task `provider_domain_id` |
| Placement ID | Publisher API/placement stats URL or dashboard placement record | Admin task `provider_placement_id` |
| Stats endpoint URL | Build from API base, domain ID, placement ID, date window, and `group_by[]=placement_sub_id` | `ADSTERRA_STATS_ENDPOINT` |
| Reconciliation secret | Generate internally with a password manager | `ADSTERRA_RECONCILE_SECRET` |

### Adsterra Checklist

1. Log in to Adsterra as a publisher.
2. Add or confirm the production website/domain.
3. Create or locate an Active SmartLink / Direct Link placement.
4. Copy the SmartLink URL into the admin sponsored task form as the task URL.
5. Capture the domain ID and placement ID for that SmartLink placement.
6. Open the Adsterra API page and generate a Publisher API token.
7. Store the token as `ADSTERRA_API_KEY`.
8. Generate a long random internal secret and store it as `ADSTERRA_RECONCILE_SECRET`.
9. Build `ADSTERRA_STATS_ENDPOINT` using this shape:

```text
https://api3.adsterratools.com/publisher/stats.json?domain=<DOMAIN_ID>&placement=<PLACEMENT_ID>&start_date=<YYYY-MM-DD>&finish_date=<YYYY-MM-DD>&group_by%5B%5D=placement_sub_id
```

10. Confirm the API response includes rows with `placement_sub_id`, clicks, impressions, and revenue/money fields.
11. In the admin task form, use:

```text
Provider: Adsterra SmartLink
Tracking param: psid
Reconciliation mode: api_reconciliation
Provider status: needs_api_reconciliation
```

### Adsterra Smoke Test

After deployment, trigger:

```http
POST /api/tasks/reconcile/adsterra
x-reconcile-secret: <ADSTERRA_RECONCILE_SECRET>
```

For a dry test before using live API data, send a body like:

```json
{
  "stats": [
    {
      "placement_sub_id": "<task_session_id>",
      "clicks": 1,
      "impressions": 1,
      "revenue": "0.001",
      "currency": "USD",
      "date": "2026-05-31"
    }
  ]
}
```

The session should complete only through `complete_sponsored_task_session`.

## CPAGrip Setup

CPAGrip setup must be confirmed inside the CPAGrip dashboard because public macro documentation is less stable and often account/product specific.

The current app endpoint is:

```text
https://<YOUR_APP_DOMAIN>/api/postback/cpagrip
```

The route accepts these aliases:

| Purpose | Accepted query params |
| --- | --- |
| Session ID | `subid`, `tracking_id`, or `cid` |
| Secret | `secret` or `password` |
| Conversion/event ID | `conversion_id`, `lead_id`, `transaction_id`, or `tracking_id` |
| Offer/campaign ID | `offer_id` or `campaign_id` |
| Status | `status`, where approved conversions should send `1` |
| Payout | `payout` |

### Values To Collect

| Value | Where to get it | App usage |
| --- | --- | --- |
| Postback password/secret | CPAGrip postback or global postback settings | `CPAGRIP_POSTBACK_SECRET` |
| Offer URL / locker URL | CPAGrip campaign, offer, content locker, or offerwall setup | Admin task `task_url` |
| Tracking parameter name | CPAGrip URL/postback macro configuration | Admin task `provider_tracking_param` |
| Conversion ID macro | CPAGrip postback macro list | Dedupe provider events |
| Offer/campaign macro | CPAGrip postback macro list | Analytics/support |
| Payout macro | CPAGrip postback macro list | Finance reconciliation |
| Approval status macro | CPAGrip postback macro list | Reward/reject routing |

### Recommended CPAGrip Postback URL

Use this as the first dashboard configuration if CPAGrip supports these macro names in your account:

```text
https://<YOUR_APP_DOMAIN>/api/postback/cpagrip?subid={tracking_id}&status={status}&secret=<CPAGRIP_POSTBACK_SECRET>&conversion_id={lead_id}&offer_id={offer_id}&payout={payout}
```

If CPAGrip uses `password` instead of `secret`, this route also accepts:

```text
https://<YOUR_APP_DOMAIN>/api/postback/cpagrip?tracking_id={tracking_id}&status={status}&password=<CPAGRIP_POSTBACK_SECRET>&lead_id={lead_id}&campaign_id={campaign_id}&payout={payout}
```

### CPAGrip Checklist

1. Log in to CPAGrip.
2. Open the offer, content locker, offerwall, or global postback settings you plan to use.
3. Find the macro list for tracking ID/sub ID, conversion ID, offer/campaign ID, payout, country, IP, and status.
4. Create a strong random postback password/secret.
5. Store that value in `CPAGRIP_POSTBACK_SECRET`.
6. Configure the CPAGrip postback URL using one of the templates above.
7. Confirm the outbound offer URL accepts the same tracking parameter the app will append.
8. In the admin task form, set the CPAGrip tracking parameter to the exact URL parameter CPAGrip expects, usually `subid`, `tracking_id`, or `cid`.
9. Run a CPAGrip test conversion/postback if the dashboard supports it.
10. Confirm the app writes a row into `sponsored_task_provider_events`.
11. Confirm duplicate postbacks return success without issuing duplicate credits.

## Production Cutover Checklist

- [ ] Provider accounts are approved and active.
- [ ] `CPAGRIP_POSTBACK_SECRET` is set in production.
- [ ] `ADSTERRA_API_KEY` is set in production.
- [ ] `ADSTERRA_RECONCILE_SECRET` is set in production.
- [ ] `ADSTERRA_STATS_ENDPOINT` is set in production.
- [ ] No provider secret uses a `NEXT_PUBLIC_` prefix.
- [ ] Adsterra test stats reconcile a pending session by `placement_sub_id`.
- [ ] CPAGrip test postback completes one pending session and duplicate retry does not double-credit.
- [ ] Admin analytics show provider events after test traffic.
- [ ] Sponsored withdrawals remain locked until at least one real provider reconciliation cycle has been reviewed.

## Reconciliation Operations

- Configure `CRON_SECRET` in the deployment platform. Vercel sends it as `Authorization: Bearer` for the hourly cron request.
- `ADSTERRA_RECONCILE_DAYS` is bounded to a maximum seven-day replay window and defaults to two days.
- Replay a missed window manually with `POST /api/tasks/reconcile/adsterra?start_date=YYYY-MM-DD&finish_date=YYYY-MM-DD` and the `x-reconcile-secret` header.
- Review the `system_failures` and `audit_logs` entries after any failed run before unlocking sponsored withdrawals.