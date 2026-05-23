# Route QA Checklist

Use this checklist before marking any route complete.

## Breakpoints

- Small mobile: 360px wide, no horizontal overflow.
- Large mobile: 430px wide, primary actions reachable above bottom navigation.
- Tablet: 768px wide, panels stack cleanly without cramped controls.
- Laptop: 1024px wide, desktop sidebar content offset is respected.
- Desktop: 1440px wide, dense surfaces stay readable and aligned.
- Wide desktop: 1728px wide, content remains constrained and does not stretch awkwardly.

## Product Layout

- Auth and app routes should feel like working software, not a marketing landing page.
- Mobile authenticated routes reserve safe space for bottom navigation.
- Desktop authenticated routes reserve left space for the persistent sidebar.
- Tables must collapse to stacked rows, sheets, or compressed rows on mobile.
- Modals use full-width bottom sheets or full-screen flows when mobile space is tight.

## Media

- Feed media keeps a stable aspect ratio before assets load.
- Video, image, and audio post surfaces do not shift when action controls appear.
- Profile grids keep 3 columns on mobile where possible and denser layouts on desktop.

## Phase 8 Launch QA

- Accessibility: icon-only controls have accessible names, forms keep visible labels, keyboard focus remains visible, and destructive actions are disabled outside valid states.
- Empty states: admin tables, moderation queues, withdrawal queues, and leaderboards show a useful empty state instead of a blank panel.
- Loading states: app-level and admin-level loading shells render without layout shift.
- Error states: app-level and admin-level error boundaries offer a retry action.
- Mobile viewport QA: verify 360px and 430px widths with no horizontal overflow and no hidden primary action behind bottom navigation.
- Desktop sidebar QA: verify 1024px, 1440px, and 1728px widths keep content offset from the sidebar.
- Profile grid QA: verify 3-column mobile grid, 4-column tablet grid, and 5-column desktop grid with stable media aspect ratios.
- Breakpoint matrix: test 360, 430, 768, 1024, 1440, and 1728px before launch.
