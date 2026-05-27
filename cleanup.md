# Cleanup Plan

This document tracks the cleanup work needed to align security, data consistency, and user experience across payments, posts, notifications, withdrawals, and abuse controls.

## Goals

- Make the database the final authority for post lifecycle, payment state, and balance-sensitive actions.
- Remove app-level state drift between UI, server actions, and database records.
- Fix privilege and RLS gaps that can block valid flows or allow invalid ones.
- Track implementation in phases so fixes can ship safely and in order.

## Phase 1: Stop privilege and lifecycle breaks

Focus on the highest-risk issues first so payment confirmation, engagement rules, and private notifications behave correctly.

### Tasks

- [x] Refactor the Paystack callback to use a trusted server path for updating `signup_payments` and `profiles`.
- [x] Decide whether the trusted payment path should be a database function, admin client flow, or dedicated server-side write helper.
- [x] Ensure payment verification updates payment status and profile onboarding state in one trusted flow.
- [x] Add database-enforced rules so likes, bookmarks, and comments can only target published posts.
- [x] Add database-enforced checks so suspended or otherwise ineligible users cannot create engagement rows.
- [x] Update withdrawal review notifications to use `recipient_profile_id` instead of global audience.
- [x] Review all moderation and admin notification writes to confirm each one is either targeted or intentionally global.
- [x] Add clear error handling for cases where a post becomes unavailable after it was already rendered in the UI.

### Exit criteria

- Payment callbacks can complete successfully under RLS without manual intervention.
- Unpublished posts cannot be engaged through direct authenticated writes.
- Withdrawal decisions are only visible to the affected user.

## Phase 2: Make counters authoritative

Move engagement and analytics counters away from app-managed read-then-update logic so concurrency does not corrupt counts.

### Tasks

- [x] Replace `syncPostCount()` with database-side counter maintenance.
- [x] Decide whether to use triggers, SQL functions, or both for likes, bookmarks, and comments.
- [x] Make likes, bookmarks, and comments write the source-of-truth row only once per action.
- [x] Update `likes_count`, `bookmarks_count`, and `comments_count` from the database layer, not from server actions.
- [x] Replace impression tracking read-then-update logic with atomic database increments.
- [x] Replace share tracking read-then-update logic with atomic database increments.
- [x] Replace video watch totals and session counts with atomic database increments.
- [x] Make action responses return authoritative counts after mutation where needed.
- [ ] Review audit logging paths so success is not reported when the main counter update failed.

### Exit criteria

- Post counters stay correct under concurrent engagement.
- Analytics writes do not rely on stale reads.
- Server actions no longer pretend success after partial counter failures.

## Phase 3: Align UX with backend truth

Make the UI reflect real server results instead of relying only on optimistic guesses.

### Tasks

- [x] Update post interaction actions to return authoritative state, including current counts and active flags.
- [x] Update `PostActions` to reconcile local state with the server response after each action.
- [x] Keep optimistic UI where helpful, but always correct local state from the returned server truth.
- [x] Return explicit validation errors when caption length or media count exceeds backend rules.
- [x] Replace silent caption trimming with a user-visible validation outcome.
- [x] Replace silent media file capping with a user-visible validation outcome.
- [x] Review post detail, feed, and profile error messages for unpublished or deleted posts.
- [x] Ensure comment creation returns enough data for the UI to stay aligned after success or failure.

### Exit criteria

- The UI can recover from stale counts or rejected actions without drifting from the database.
- Users receive clear feedback when backend rules reject or adjust their input.

## Phase 4: Remove operational drift and race windows

Fix cleanup, transaction, and rate-limit weaknesses that can create hidden data problems over time.

### Tasks

- [x] Add cleanup logic to remove uploaded media when post insert fails.
- [x] Decide whether failed upload cleanup lives in the server action, a storage helper, or a retry job.
- [x] Move withdrawal request validation and insert into one transactional database path.
- [x] Prevent concurrent withdrawal requests from overspending the same available balance.
- [x] Replace process-local memory rate limiting with shared storage such as Redis or a database-backed limiter.
- [x] Review all high-value actions and callback endpoints to confirm they use the shared limiter.
- [x] Add operational logging for failed cleanup, failed payment transitions, and rejected transactional writes.
- [ ] Add regression tests for payment confirmation, post engagement lifecycle enforcement, and withdrawal concurrency.

### Exit criteria

- Failed post creation does not leave orphaned media behind.
- Withdrawal creation cannot race into an invalid balance state.
- Rate limiting behaves consistently across deploys and server instances.

## Suggested implementation order

1. Phase 1
2. Phase 2
3. Phase 3
4. Phase 4

## Tracking notes

- Mark a task complete only after code change and verification are both done.
- If a phase reveals a deeper dependency, add a new checklist item under that phase instead of tracking it elsewhere.
- Keep database contract changes ahead of UI cleanup when both are related to the same issue.
