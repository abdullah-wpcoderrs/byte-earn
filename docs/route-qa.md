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
