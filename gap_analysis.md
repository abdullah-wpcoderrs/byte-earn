# Main User Routes Gap Analysis

This document provides a thorough review and gap analysis of the main user routes (excluding admin routes) in byte-earn. It incorporates feedback regarding user-facing transaction history sub-pages and secure admin-configurable earning/withdrawal controls.

---

## Executive Summary

While the user routing shell and database schemas are established, there are significant gaps where the frontend UI, user actions, and database states are disconnected. 

1. **Wallet Page (`/wallet`)**: The dashboard displays a "Master Balance" that represents gross historical earnings rather than net current balances. Users cannot see transaction history or past withdrawal requests on the dashboard, nor is there a navigation path to a detailed history page. Additionally, bank details do not prefill or validate from the profile.
2. **Sponsored Tasks Page (`/tasks`)**: Users can complete CPAGrip and Adsterra tasks, but internal campaigns (share, watch, visit) rely on client-side triggers that can easily be farmed. There is no session history list to check task approval status.
3. **Referral Flow (`/ref/[code]`, Profile)**: The database triggers correctly award referral credits when referred users become active, but the frontend only shows a raw referral count. Users have no way to see who they referred, the qualification status, or rejection reasons.
4. **Organic Watch-Time Earnings**: Users can watch normal creator videos (which increments metrics in the database), but there is no mechanism to distribute credits for organic watch time. The watch_time source exists in the schema but remains uncredited.
5. **Earning and Withdrawal Configuration (Feedback Integration)**: Admins need the ability to configure the credits earned per route (sponsored tasks, referrals, organic watch time, etc.) and explicitly toggle which earning sources are available for user withdrawals. This must be securely enforced at the database level.

---

## 1. Wallet Functionality Gap Analysis

### Current Implementation Status
- **Route**: `app/(app)/wallet/page.tsx`
- **Component**: `components/wallet/wallet-dashboard.tsx`
- **Actions**: `app/(app)/wallet/actions.ts`
- **Helper**: `lib/wallet-data.ts`, `lib/wallet.ts`
- **Database**: `withdrawals` table and the `request_withdrawal_atomically` PL/pgSQL function.

### Critical Gaps Against Production

#### Gap 1.1: Master Balance is Gross, Not Net
- **Current Behavior**: The wallet dashboard defines `Master Balance` as `referralCredits + sponsoredCredits` (the gross sum of all positive earning entries in the credit ledger). It does not subtract the amount of credits the user has already withdrawn or has pending.
- **Production Impact**: A user who has earned 10,000 credits and successfully withdrawn 9,000 credits will still see a "Master Balance" of 10,000 credits, while the "Available for Withdrawal" card will show 1,000 credits. This is highly confusing.
- **Next Step**: Redefine the master balance or current balance to be the net balance: `Gross Earnings - (Pending + Approved + Paid Withdrawals)`.

#### Gap 1.2: Ignored Earning Sources in UI (RESOLVED)
- **Status**: Resolved. Ledger reduction in `lib/wallet-data.ts` now aggregates `admin_credit` and `adjustment` sources.

#### Gap 1.3: Lack of Transaction and Withdrawal History Page (RESOLVED)
- **Status**: Resolved. A dedicated `/wallet/history` page has been created at `app/(app)/wallet/history/page.tsx` displaying full ledger history and withdrawal statuses.

#### Gap 1.4: Disconnected Bank Details on Withdrawal Form (PARTIALLY RESOLVED)
- **Current Behavior**: Prefilling bank details from the profile works. However, the user cannot edit or update their bank details on the profile page once onboarding is completed.
- **Next Step**: Add editable Bank details fields to the profile form in `app/(app)/profile/page.tsx` with proper input validation.

---

## 2. Sponsored Task Earnings Gap Analysis

### Current Implementation Status
- **Route**: `app/(app)/tasks/page.tsx` & `app/(app)/tasks/[id]/page.tsx`
- **Components**: `components/tasks/task-engine.tsx`
- **Actions**: `app/(app)/tasks/actions.ts`
- **Helper**: `lib/tasks-data.ts`, `lib/tasks.ts`, `lib/task-fraud.ts`
- **API Endpoints**: `/api/postback/cpagrip`, `/api/tasks/reconcile/adsterra`, and `/api/postback/monetag` (deprecated).

### Critical Gaps Against Production

#### Gap 2.1: Client-Triggered Completion for Internal Tasks (Farming Risk)
- **Current Behavior**: When completing an internal task (e.g., share campaigns), the frontend resolves the share API or clipboard copy, and immediately calls the server action `completeInternalTask` to log a pending session.
- **Production Impact**: Scripted client-side API requests can generate completion events without actual off-platform sharing, potentially draining campaign budgets.
- **Next Step**: Implement server-side verification:
  - For `share_link`, reward only after a visitor lands on the site via the generated referral/campaign URL.
  - For `visit_url`, track the elapsed duration between start and completion pings on the server.
  - For `watch_media`, enforce server-monitored milestone triggers.

#### Gap 2.2: Missing Task Verification / Review Status UI
- **Current Behavior**: If a task is pending or marked suspicious (under review) by the fraud prevention engine, the page displays a simple "Pending verification" or "Under review" message on the task card.
- **Production Impact**: Users cannot see *why* a task is under review, nor can they view a historical list of completed tasks with rejection reasons.
- **Next Step**: Add a "Recent Task Activity" log to the task page where users can inspect their task sessions, complete times, statuses, and reasons for rejection.

#### Gap 2.3: Adsterra Stats Reconciliation Delay
- **Current Behavior**: Adsterra direct links are tracked via `psid` appended to redirect URLs. Verification relies on calling `/api/tasks/reconcile/adsterra` with stats pulled from the Adsterra Publisher API.
- **Production Impact**: Because Adsterra reconciliation is structured as a pull API, completions remain "pending" until an external system or cron job hits the POST endpoint with the secret. There is no automated cron job/scheduler wired into the Next.js runtime yet to execute this regularly.
- **Next Step**: Set up a background worker or cron route to automatically run the Adsterra reconciliation API at regular intervals.

---

## 3. Referral Earnings Gap Analysis

### Current Implementation Status
- **Redirection Route**: `app/ref/[code]/route.ts` (resolves referral codes, sets the `byte_earn_ref` cookie, redirects to gateway).
- **Signup logic**: `app/auth/actions.ts` (checks cookie or form input, creates a `referral_attributions` record).
- **Database Trigger**: `qualify_referral_on_profile_activation` database trigger and `"private"."qualify_referral_for_profile"` database function.

### Critical Gaps Against Production

#### Gap 3.1: Complete Lack of Referral Tracking UI (RESOLVED)
- **Status**: Resolved. A detailed referral list showing name, registration date, status, and earnings has been implemented as a table on the profile page using the `ReferralList` component.

#### Gap 3.2: Verification and Cooldown Checks
- **Current Behavior**: The `/ref/[code]` route uses a rate-limiter based on IP and referral code. However, it does not prevent a user from repeatedly visiting their own referral link to inflate `referral_visits` rows in the database.
- **Production Impact**: Database storage can be flooded with fake visits.
- **Next Step**: Enforce stricter fraud detection on referral clicks, such as ignoring visits where the client IP matches the referrer's last known active IP.

#### Gap 3.3: System Reserved Usernames and Bank Prefills on Profile
- **Current Behavior**: Users can choose any username, including system routes like `admin` or `wallet`. Also, bank details cannot be edited once saved.
- **Next Step**: Implement a blacklist for reserved usernames and add editable, validated bank inputs on `/profile`.

#### Gap 3.2: Verification and Cooldown Checks
- **Current Behavior**: The `/ref/[code]` route uses a rate-limiter based on IP and referral code. However, it does not prevent a user from repeatedly visiting their own referral link to inflate `referral_visits` rows in the database.
- **Production Impact**: Database storage can be flooded with fake visits.
- **Next Step**: Enforce stricter fraud detection on referral clicks, such as ignoring visits where the client IP matches the referrer's last known active IP.

---

## 4. Organic Watch-Time Earnings Gap Analysis

### Current Implementation Status
- **Route**: `app/(app)/posts/[id]`
- **Action**: `app/(app)/posts/actions.ts` -> `recordVideoWatchAction`
- **Database**: `posts` table columns (`video_watch_seconds_total`, `video_watch_sessions_count`).

### Critical Gaps Against Production

#### Gap 4.1: Watch-Time is Analytical Only (No Rewards Wired In)
- **Current Behavior**: When users watch videos on the feed or single post page, the frontend triggers `recordVideoWatchAction`, which increments the post's total watch seconds and session counts in the database. No credits are calculated or awarded.
- **Production Impact**: The database schema contains a `watch_time` earning source and the `reward_rules` table contains a disabled placeholder for `watch_time_milestone`. However, there is no actual service or trigger that distributes credits to content creators or viewers for organic watch time.
- **Next Step**: If organic watch-time earnings are part of the launch scope:
  - Define whether creators earn credits, viewers earn credits, or both.
  - Wire up a server action or database transaction that periodically checks watch time additions and inserts corresponding `watch_time` records into the `credit_ledger`, updating `profiles.credits_balance`.
  - If it is not in scope, clarify in the UI that organic watch-time does not grant credits.

---

## 5. Earning and Withdrawal Configuration (Feedback Integration)

To make the earning and withdrawal system secure, robust, and completely managed from the Admin panel:

### 5.1 Admin Control over Earning Coefficients
Admins must be able to dynamically configure:
- **Sponsored Task Earnings**: Default rewards or multiplier coefficients (although individual sponsored tasks specify their own `reward_credits`, global factors can be governed by admin).
- **Referral Earnings Amount**: Configured via the `reward_rules` table for `referral_qualified`.
- **Other Earnings (Organic Watch-Time, Milestones)**: Configured in the `reward_rules` or dedicated finance settings.

### 5.2 Admin Control over Withdrawal Eligibility
Admins must be able to activate or deactivate which earning sources are eligible for withdrawal:
- Toggle withdrawal eligibility for `referral` earnings.
- Toggle withdrawal eligibility for `sponsored_task` earnings.
- Toggle withdrawal eligibility for `watch_time` earnings.
- Toggle withdrawal eligibility for `admin_credit` / `adjustment` earnings.

### 5.3 Secure Database-Level Enforcement Architecture
To prevent exploit vulnerabilities:
- The database remains the source of truth.
- `platform_settings` table will be extended with boolean flags:
  - `referral_withdrawals_unlocked` (default true)
  - `sponsored_withdrawals_unlocked` (default false)
  - `watch_time_withdrawals_unlocked` (default false)
  - `admin_credit_withdrawals_unlocked` (default true)
  - `adjustment_withdrawals_unlocked` (default true)
- The atomic postgres function `"private"."request_withdrawal_atomically"` will be updated to fetch these flags and sum only the ledger entries whose earning sources are currently unlocked:
  ```sql
  -- Sum only credits from unlocked sources
  SELECT COALESCE(SUM(credits), 0)
  INTO total_unlocked_credits_earned
  FROM "public"."credit_ledger"
  WHERE profile_id = request_profile_id
    AND (
      (source = 'referral' AND settings.referral_withdrawals_unlocked) OR
      (source = 'sponsored_task' AND settings.sponsored_withdrawals_unlocked) OR
      (source = 'watch_time' AND settings.watch_time_withdrawals_unlocked) OR
      (source = 'admin_credit' AND settings.admin_credit_withdrawals_unlocked) OR
      (source = 'adjustment' AND settings.adjustment_withdrawals_unlocked)
    );
  ```
- Balance calculations in the frontend wallet queries will mirror this query exactly to ensure zero discrepancies between UI representation and database execution.
