# Sponsored Task User Flow and Security Explainer

This document explains how sponsored tasks work now in plain terms.

There are three sponsored task providers:

- Adsterra SmartLink tasks
- CPAGrip partner offer tasks
- Internal sponsored campaign tasks

All three use the same basic principle: users do not receive credits just because they clicked a button. The app first creates a pending task session, then waits for trusted proof before issuing credits.

## 1. Adsterra SmartLink Tasks

### What The User Sees

The user sees these under Daily Ad Rewards on the tasks page.

When the user clicks the task button:

1. The app checks that the task is active and available.
2. The app creates a pending session for that user and task.
3. The app opens the Adsterra SmartLink in a new browser tab.
4. The user completes the ad flow outside the app.
5. The task card shows a pending verification message.

The user does not get credits immediately.

### How Credits Are Issued

Adsterra does not work like a normal instant postback task in this implementation. Instead, the app adds a tracking value to the Adsterra URL:

```text
psid=<task_session_id>
```

Later, the server calls Adsterra's Publisher API and checks whether Adsterra reported activity for that same session ID. Adsterra reports that value as `placement_sub_id`.

If Adsterra reports a real click or revenue for that pending session, the app completes the task through the trusted database reward function.

### Why This Prevents Points Farming

Users cannot get credits by repeatedly clicking the button because:

- Clicking only creates a pending session.
- The session must be confirmed by Adsterra stats.
- A user cannot start unlimited pending sessions for the same task.
- The app rate-limits starts by user and IP address.
- Suspicious same-IP activity can be moved to admin review.
- Rewards are issued only by the server-side database function, not the browser.

## 2. CPAGrip Partner Offer Tasks

### What The User Sees

The user sees these under Partner Offers on the tasks page.

When the user clicks the task button:

1. The app checks that the task is active and available.
2. The app creates a pending session.
3. The app opens the CPAGrip offer URL in a new tab.
4. The user completes the offer on CPAGrip.
5. The task remains pending until CPAGrip confirms the conversion.

The user does not get credits just for opening the offer.

### How Credits Are Issued

The app appends a tracking parameter to the CPAGrip offer URL. The exact parameter can be configured in the admin task form, for example:

```text
subid=<task_session_id>
```

or:

```text
tracking_id=<task_session_id>
```

When CPAGrip confirms a valid conversion, it calls the app's postback URL:

```text
/api/postback/cpagrip
```

The postback must include the correct secret. If the secret is wrong, the app rejects it.

If the postback is valid, the server completes the pending session through the trusted database reward function.

### Why This Prevents Points Farming

Users cannot farm credits by refreshing, opening the offer repeatedly, or faking a browser result because:

- The browser never decides that a CPAGrip task is complete.
- The app waits for CPAGrip's server-to-server postback.
- The postback must include the configured secret.
- Duplicate provider conversion IDs are detected and do not double-credit.
- Rejected or non-approved statuses mark the session rejected instead of rewarded.
- Same-IP velocity checks can move suspicious conversions into admin review.
- Daily user caps and global campaign caps are enforced inside the database reward function.

## 3. Internal Sponsored Campaign Tasks

Internal campaigns are tasks created by the platform admin. They can be share tasks, visit tasks, watch-media tasks, or manual-review tasks.

### Share Tasks

The user sees a sponsored campaign and clicks Share.

The app helps the user share or copy a branded referral link, but the user does not receive credits immediately. The task is submitted for validation.

An admin can later approve or reject the pending task session.

This prevents users from earning credits just by copying a link without actually doing useful campaign activity.

### Visit Tasks

The user clicks Visit.

The app creates a pending visit session and opens the destination page with a session tracking parameter. The user must return after the required dwell time and complete verification.

The server checks that:

- The session belongs to the logged-in user.
- The task is an internal visit task.
- The session is still pending.
- Enough time has passed.

Only then can credits be issued.

### Watch-Media Tasks

The user watches the media attached to the task.

The task can only be completed after the app records enough watch time. The server still checks the submitted watch time before completing the task.

This prevents users from earning credits by clicking Watch without watching the media.

### Manual-Review Tasks

Some internal tasks are too hard to verify automatically. These tasks create a pending session and wait for admin review.

The admin can approve or reject the session from the admin sponsored task validation queue.

## Shared Security Rules Across All Sponsored Tasks

These rules apply across Adsterra, CPAGrip, and internal campaigns.

### 1. The Database Is The Reward Authority

Credits are issued through one trusted database function:

```text
complete_sponsored_task_session
```

That function updates the task session, credit ledger, user balance, and task completion count together.

This avoids a situation where the user balance changes but the ledger does not, or where a task completion is counted without a matching reward record.

### 2. Tasks Must Be Active

Users can only start active tasks.

Draft, paused, archived, or disabled-platform tasks cannot be started from the normal user flow.

### 3. Clicking Is Not Completion

A click only starts a pending session. The app waits for one of these:

- Adsterra API reconciliation
- CPAGrip server postback
- Internal dwell-time validation
- Internal watch-time validation
- Admin approval

### 4. Duplicate Rewards Are Blocked

The app stores provider event IDs and session statuses.

If the same provider event arrives again, the app treats it as a duplicate instead of paying twice.

### 5. Daily And Global Caps Are Enforced

Each task has a daily user limit.

Tasks can also have a global campaign cap. Once the global cap is reached, the database reward function rejects further completions.

These caps are checked at reward time, not only when the user clicks the task.

### 6. Pending Session Limits Reduce Spam

The app limits active pending sessions per user and task.

This means a user cannot keep opening the same task again and again while previous attempts are still waiting for verification.

### 7. Rate Limits Reduce Abuse

Task starts and internal submissions are rate-limited by user and IP address.

This slows down automated scripts and repeated manual clicking.

### 8. Same-IP Velocity Checks Flag Suspicious Activity

If many sessions for the same task come from the same IP address in a short time, provider confirmations can be marked suspicious instead of rewarded.

Suspicious sessions go to admin review.

### 9. New Accounts Have Safer Limits

New users have a temporary sponsored-task limit.

This reduces the risk of users creating fresh accounts to farm sponsored task credits quickly.

### 10. Admin Review Handles Weak Signals

When automatic proof is weak or suspicious, the task does not pay instantly.

It enters the admin validation queue. Admins can approve legitimate activity or reject abuse.

## Simple User-Facing Explanation

If users ask why credits are pending, support can say:

```text
Sponsored task credits are verified before they are added to your wallet. Some tasks are confirmed by our ad partners, while others are reviewed by our system or admin team. This prevents fake clicks and duplicate rewards, and it keeps sponsored rewards fair for everyone.
```

## Operational Notes For Admins

- Keep sponsored withdrawals locked until provider reconciliation has been tested with real traffic.
- Review suspicious sessions before approving rewards.
- Use small daily caps for new Adsterra and CPAGrip campaigns until conversion quality is confirmed.
- Check provider events when a user reports missing credits.
- Do not manually approve suspicious sessions unless the provider event and user activity look legitimate.
