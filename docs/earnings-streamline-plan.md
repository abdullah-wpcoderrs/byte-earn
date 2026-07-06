# Earnings Surface Simplification Plan

## Summary

The app should present earnings as a simple two-source model:
- Sponsored earnings
- Referral earnings

All other earning categories should be removed from the user-facing experience. The goal is to make the wallet and earnings surfaces easier to understand, easier to trust, and easier to act on.

## Product Goal

Reduce cognitive load by showing users only the earnings paths that matter most:
1. Sponsored earnings from completed tasks and campaigns
2. Referral earnings from successful referrals

## Scope

### In scope
- Wallet page copy, summary cards, and source breakdown
- Sponsored earnings page copy, layout, and status messaging
- Earnings-related entry points on the app shell and task surfaces
- User-facing labels and helper text

### Out of scope for this pass
- Backend payout rules beyond current withdrawal logic
- New payout methods or reward engine changes
- Admin reporting redesign

## Current Problem

The current experience mixes multiple earning concepts in a way that makes the wallet and earnings pages feel fragmented. Users are asked to interpret several categories, even though the product value proposition is simpler: earn through sponsorships and referrals.

## Target Experience

### Wallet page
- Show two primary earning sources:
  - Referral earnings
  - Sponsored earnings
- Highlight the withdrawable balance clearly
- Keep the history and withdrawal experience intact
- Remove or hide any labels that imply additional earning categories are active user-facing features

### Sponsored earnings page
- Become the primary place to understand task-based earnings
- Show a clear summary of:
  - total sponsored earnings
  - currently available sponsored earnings
  - locked sponsored earnings
  - recent sponsored activity
- Keep copy focused on sponsorships and completion flow

## Rules for the new experience

- Referral earnings are presented as a first-class earning stream
- Sponsored earnings are presented as the task-based earning stream
- Any other earnings categories should not be surfaced as active user-facing options
- Legacy internal categories may remain in the data layer, but should not appear in the UI unless explicitly needed for support or admin review
- Withdrawal rules remain the same: referrals stay withdrawable, sponsored earnings follow the current lock policy

## User-facing changes

### Wallet page changes
- Replace multi-source clutter with a concise two-source summary
- Rename any broad or ambiguous labels to clearer terms
- Use helper copy that explains the difference between:
  - withdrawable balance
  - locked sponsored earnings
  - referral earnings
  - total withdrawn

### Sponsored earnings page changes
- Rename the page experience to feel like an earnings hub rather than a generic task page
- Highlight payout status and available balance clearly
- Reduce unnecessary task detail noise and focus on the reward story

## Content direction

Suggested copy themes:
- “Your earnings, simplified”
- “Two ways to earn”
- “Sponsored rewards and referral rewards”
- “Withdraw what is available, keep locked earnings visible”

## Implementation notes

### Frontend
- Update wallet summary cards and breakdown rows to only show referral and sponsored earnings as primary sources
- Update sponsored results and task-related copy to align with the new simplified narrative
- Simplify empty states, helper text, and CTA labels

### Backend/data
- Keep the data model intact for historical records
- If legacy source labels still exist in the database or ledger, map them to the new simplified labels in the presentation layer only
- Avoid introducing new user-facing categories that conflict with the simplified model

## Acceptance criteria

- Users can clearly distinguish between referral earnings and sponsored earnings on the wallet page
- The sponsored earnings page clearly communicates sponsored reward value and availability
- No primary wallet or earnings view presents additional earning categories as active user-facing options
- The withdrawal experience remains understandable and consistent with current rules
- The new experience feels simpler and more focused than the current version
