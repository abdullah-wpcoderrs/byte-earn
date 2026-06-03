# CPAGrip + Adsterra Setup Guide

Use this guide to connect both CPAGrip and Adsterra to this app in a way that works for local testing and production.

This app already supports both providers, but they do not behave the same:

- CPAGrip uses a server-to-server postback flow.
- Adsterra uses a delayed stats reconciliation flow.

That difference matters because the app trusts the database and the provider callback flow to decide when a reward is actually complete.

## 1. What This App Expects

Set these server-only environment variables:

```env
CPAGRIP_POSTBACK_SECRET=
ADSTERRA_API_KEY=
ADSTERRA_RECONCILE_SECRET=
ADSTERRA_STATS_ENDPOINT=
```

Do not expose these with `NEXT_PUBLIC_`.

## 2. How Each Provider Works

### CPAGrip flow

1. A user starts a CPAGrip task in the app.
2. The app creates a pending `task_sessions` row.
3. The app appends the session ID to the CPAGrip offer URL using the task's tracking parameter.
4. The user completes the offer on CPAGrip.
5. CPAGrip calls this route:

```text
/api/postback/cpagrip
```

6. The server validates the secret, checks the session, checks fraud signals, and completes the reward through the trusted database RPC.

### Adsterra flow

1. A user starts an Adsterra task in the app.
2. The app creates a pending `task_sessions` row.
3. The app appends `psid=<task_session_id>` to the Adsterra SmartLink.
4. The user opens the Adsterra SmartLink.
5. Later, the app reconciles Adsterra stats through this route:

```text
/api/tasks/reconcile/adsterra
```

6. The server checks `placement_sub_id` or `psid`, matches it back to the pending session, checks fraud signals, and completes the reward through the trusted database RPC.

## 3. Values You Need Before You Start

Prepare these values from both dashboards.

### CPAGrip

| Value | Where it comes from | Used for |
| --- | --- | --- |
| Postback secret | CPAGrip postback settings | `CPAGRIP_POSTBACK_SECRET` |
| Offer URL or locker URL | CPAGrip offer or locker setup | Admin task `task_url` |
| Tracking parameter | CPAGrip click ID setting | Admin task `provider_tracking_param` |
| Offer or campaign ID | CPAGrip offer metadata | Admin task `provider_placement_id` |
| Postback status macro | CPAGrip macro list | Approve or reject reward |
| Conversion ID macro | CPAGrip macro list | Deduplicate callbacks |
| Payout macro | CPAGrip macro list | Provider event logging |

### Adsterra

| Value | Where it comes from | Used for |
| --- | --- | --- |
| Publisher API token | Adsterra publisher API page | `ADSTERRA_API_KEY` |
| SmartLink URL | Adsterra SmartLink placement | Admin task `task_url` |
| Placement ID | Adsterra placement record | Admin task `provider_placement_id` |
| Domain ID | Adsterra domain record | Admin task `provider_domain_id` |
| Reconcile secret | Your own generated secret | `ADSTERRA_RECONCILE_SECRET` |
| Stats endpoint | Built from Adsterra API URL | `ADSTERRA_STATS_ENDPOINT` |

## 4. Fill In Your App URL

Decide which public base URL each environment will use.

```text
Local public URL: https://<your-tunnel-or-preview-domain>
Production URL: https://<your-production-domain>
```

Examples:

```text
Local public URL: https://byte-earn-local.trycloudflare.com
Production URL: https://app.byteearn.example
```

If you want real CPAGrip or Adsterra callbacks while developing locally, `localhost` is not enough by itself. Both providers need a public URL, so use a tunnel or temporary public preview URL.

## 5. Local Testing Strategy

Use one of these two local approaches.

### Option A: Fast local logic test

Use this when you only want to verify the app logic.

- Run the app locally with `npm run dev`.
- Keep your local `.env` values set.
- Create tasks in the admin UI.
- Trigger CPAGrip and Adsterra callback routes manually with test requests.

This is the fastest way to prove that session creation, callback handling, database writes, and reward completion work.

### Option B: Real provider test from local dev

Use this when you want CPAGrip or Adsterra to call your local app.

1. Run the app locally:

```bash
npm run dev
```

2. Expose the app with a tunnel such as Cloudflare Tunnel or ngrok.
3. Put that public tunnel URL into the provider dashboard where required.
4. Use the tunnel URL in the postback or reconciliation flow.

This is the closest local test to production.

## 6. CPAGrip Setup Step by Step

### Env setup

Add this to your local `.env` and production environment:

```env
CPAGRIP_POSTBACK_SECRET=<your-random-secret>
```

### Dashboard setup

Point CPAGrip postbacks to:

```text
https://<YOUR_APP_DOMAIN>/api/postback/cpagrip
```

Recommended first template:

```text
https://<YOUR_APP_DOMAIN>/api/postback/cpagrip?subid={tracking_id}&status={status}&secret=<CPAGRIP_POSTBACK_SECRET>&conversion_id={lead_id}&offer_id={offer_id}&payout={payout}
```

If your CPAGrip account uses `password` instead of `secret`, use:

```text
https://<YOUR_APP_DOMAIN>/api/postback/cpagrip?tracking_id={tracking_id}&status={status}&password=<CPAGRIP_POSTBACK_SECRET>&lead_id={lead_id}&campaign_id={campaign_id}&payout={payout}
```

The route currently accepts these aliases:

| Purpose | Accepted params |
| --- | --- |
| Session ID | `subid`, `tracking_id`, `cid` |
| Secret | `secret`, `password` |
| Conversion ID | `conversion_id`, `lead_id`, `transaction_id` |
| Offer ID | `offer_id`, `campaign_id` |
| Status | `status` |
| Payout | `payout` |

### Admin task setup

In the admin task form:

- Provider: `CPAGrip Offer Task`
- Task URL: your CPAGrip offer URL
- Tracking Parameter: usually `subid`, `tracking_id`, or `cid`
- Offer or Campaign ID: save this in `provider_placement_id`

Make sure the tracking parameter in the task form matches the parameter CPAGrip expects on the outbound offer URL.

### Local callback test

Use a manual request like this against local dev:

```text
http://localhost:3000/api/postback/cpagrip?subid=<task_session_id>&status=1&secret=<CPAGRIP_POSTBACK_SECRET>&conversion_id=test-conv-1&offer_id=<provider_placement_id>&payout=0.50
```

If you are testing through a tunnel, replace `http://localhost:3000` with your tunnel URL.

### What success looks like

- A pending task session exists before the callback.
- The callback returns success.
- A row is written to `sponsored_task_provider_events`.
- The task session moves from `pending` to completed, unless it is flagged for review.
- Repeating the same `conversion_id` should not double-credit the user.

## 7. Adsterra Setup Step by Step

### Env setup

Add these locally and in production:

```env
ADSTERRA_API_KEY=<your-adsterra-api-key>
ADSTERRA_RECONCILE_SECRET=<your-random-secret>
ADSTERRA_STATS_ENDPOINT=https://api3.adsterratools.com/publisher/stats.json?domain=<DOMAIN_ID>&placement=<PLACEMENT_ID>&start_date=<YYYY-MM-DD>&finish_date=<YYYY-MM-DD>&group_by%5B%5D=placement_sub_id
```

### Dashboard setup

1. Create or confirm an active SmartLink placement in Adsterra.
2. Copy the SmartLink URL.
3. Capture the placement ID.
4. Capture the domain ID.
5. Generate the Adsterra Publisher API token.

### Admin task setup

In the admin task form:

- Provider: `Adsterra SmartLink Task`
- Task URL: your Adsterra SmartLink URL
- Placement ID: save this in `provider_placement_id`
- Domain ID: save this in `provider_domain_id`

This app automatically expects:

- Tracking param: `psid`
- Reconciliation mode: `api_reconciliation`
- Provider status: `needs_api_reconciliation`

### Fast local dry test

You can test Adsterra logic without waiting for live Adsterra stats by posting mock rows to the reconciliation route.

Request:

```http
POST /api/tasks/reconcile/adsterra
x-reconcile-secret: <ADSTERRA_RECONCILE_SECRET>
Content-Type: application/json
```

Body:

```json
{
  "stats": [
    {
      "placement_sub_id": "<task_session_id>",
      "clicks": 1,
      "impressions": 1,
      "revenue": "0.001",
      "currency": "USD",
      "date": "2026-06-02"
    }
  ]
}
```

Local URL example:

```text
http://localhost:3000/api/tasks/reconcile/adsterra
```

Tunnel or production example:

```text
https://<YOUR_APP_DOMAIN>/api/tasks/reconcile/adsterra
```

### Live reconciliation test

Once `ADSTERRA_STATS_ENDPOINT` and `ADSTERRA_API_KEY` are valid, call the reconciliation route without sending mock `stats` in the body. The route will fetch from Adsterra directly.

### What success looks like

- A pending Adsterra session exists.
- The task start URL includes `psid=<task_session_id>`.
- Reconciliation finds the same ID as `placement_sub_id` or `psid`.
- A row is written to `sponsored_task_provider_events`.
- The session completes only when Adsterra reports real activity such as clicks or revenue.

## 8. Local vs Production Checklist

### Local

- [ ] `npm run dev` is running
- [ ] Local `.env` has all provider secrets
- [ ] Task created in admin UI
- [ ] A pending `task_sessions` row is created when the task starts
- [ ] CPAGrip manual callback succeeds
- [ ] Adsterra dry reconciliation succeeds
- [ ] Duplicate CPAGrip callback does not double-credit

### Production

- [ ] Production env has all four provider variables
- [ ] Provider dashboards use the production app URL
- [ ] Production admin tasks use real SmartLink and offer URLs
- [ ] CPAGrip postback reaches the live route
- [ ] Adsterra reconciliation route can fetch live stats
- [ ] A real provider event creates a provider event row
- [ ] A real provider event can complete a pending task session

## 9. Suggested Test Order

Follow this order to reduce confusion:

1. Configure local env values.
2. Start the app locally.
3. Create one CPAGrip task and one Adsterra task in admin.
4. Start each task once so both create pending sessions.
5. Test CPAGrip with a manual callback URL.
6. Test Adsterra with the mock reconciliation payload.
7. If both pass locally, repeat using a public tunnel URL.
8. After that, move the same setup into production env and dashboards.

## 10. Fill-In Template

Replace these with your real values:

```env
CPAGRIP_POSTBACK_SECRET=<secret>
ADSTERRA_API_KEY=<api_key>
ADSTERRA_RECONCILE_SECRET=<secret>
ADSTERRA_STATS_ENDPOINT=https://api3.adsterratools.com/publisher/stats.json?domain=<domain_id>&placement=<placement_id>&start_date=<yyyy-mm-dd>&finish_date=<yyyy-mm-dd>&group_by%5B%5D=placement_sub_id
```

```text
Local public app URL: <local tunnel url>
Production app URL: <production app url>

CPAGrip task URL: <cpagrip offer url>
CPAGrip tracking parameter: <subid or tracking_id or cid>
CPAGrip offer or campaign ID: <offer_id>

Adsterra SmartLink URL: <adsterra smartlink url>
Adsterra placement ID: <placement_id>
Adsterra domain ID: <domain_id>
```

## 11. Important Notes

- CPAGrip and Adsterra should both be added, but they should not be treated as the same flow.
- CPAGrip is callback-driven.
- Adsterra is reconciliation-driven.
- Rewards should only be trusted after the provider confirmation path updates the database.
- For local tests, a tunnel is needed if you want the provider to call your machine directly.
- For production, always switch dashboard callback URLs and task URLs to the real production domain before going live.
