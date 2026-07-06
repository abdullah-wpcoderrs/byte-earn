# Wallet and Sponsored Earnings UI Redesign Spec

## Objective

Redesign the wallet page and the sponsored earnings experience so they feel modern, focused, and easier to understand.

## Design goals

- Make the wallet feel like a financial control center
- Make sponsored earnings feel like a rewards dashboard
- Prioritize the amounts users care about most
- Reduce visual clutter and ambiguous labels
- Keep the experience mobile-friendly and polished

## Wallet page redesign direction

### Layout
- Use a stronger hero section for the withdrawable balance
- Place the primary CTA near the top of the page
- Group supporting information beneath the hero in a compact, scannable format
- Use cards for:
  - referral earnings
  - sponsored earnings
  - available balance
  - total withdrawn

### Visual treatment
- Use a cleaner card system with stronger hierarchy
- Keep the main value large and prominent
- Use subtle color accents for positive and locked states
- Separate withdrawable balance from locked or reserved balances clearly

### Content hierarchy
1. Main balance
2. Primary action: request withdrawal
3. Short explanation of what is available now
4. Two-source breakdown: referral and sponsored
5. Supporting history and recent activity

### UX behavior
- The withdrawable amount should be the obvious primary metric
- Locked sponsored earnings should feel informative, not alarming
- The wallet should clearly explain why some earnings are not yet withdrawable

## Sponsored earnings page redesign direction

### Layout
- Reframe the experience as a rewards dashboard for sponsored activity
- Use a top summary section for:
  - total sponsored earnings
  - available sponsored earnings
  - locked sponsored earnings
  - recent completion activity

### Content structure
- Hero summary at the top
- Short guidance on how sponsored earning works
- Current status of task reward availability
- A clear section for active tasks and reward rules

### Visual treatment
- Make the reward value feel tangible and motivating
- Use concise stat cards instead of dense text blocks
- Keep the page visually aligned with the wallet redesign for consistency

## Suggested sections

### Wallet page
- Hero summary
- Quick action area
- Earnings breakdown
- Recent activity
- Full history link

### Sponsored earnings page
- Earnings summary
- How it works
- Available tasks and reward opportunities
- Reward rules and status
- Completion guidance

## Mobile considerations

- Keep the hero area concise and readable on small screens
- Stack cards vertically on mobile
- Preserve tap targets and spacing
- Keep history and activity sections easy to scan
- Avoid overly dense tables on small screens

## Interaction notes

- CTA buttons should be clear and prominent
- Empty states should feel helpful, not blank
- Locked states should use simple, calm messaging
- Use consistent terminology across wallet and sponsored pages

## Copy direction

Use short, direct language such as:
- “Referral earnings”
- “Sponsored earnings”
- “Withdrawable balance”
- “Locked earnings”
- “Available now”
- “Your earnings, simplified”

## Acceptance criteria

- The wallet page clearly centers the withdrawable balance
- Referral and sponsored earnings are visually and conceptually distinct
- The sponsored earnings page feels like a polished rewards dashboard
- The redesign is consistent across desktop and mobile
- The experience feels simpler than the current version without losing important context
