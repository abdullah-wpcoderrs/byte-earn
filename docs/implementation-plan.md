# byte-earn Implementation Plan

## Product Thesis

byte-earn is a dark-mode-first social earning platform where access is gated by a one-time Paystack payment, creators earn credits from referrals and sponsored engagement, and admins control moderation, liquidity, leaderboard rules, payout locks, and platform availability.

## Technical Baseline

- Framework: Next.js App Router with Tailwind CSS v4.
- UI: DM Sans globally, Lucide React icons, 5px radius on controls and containers, glassmorphic dark blue surfaces.
- Typography: body text defaults to 11px, header text defaults to 16px, and the largest allowed font size anywhere in the product is 28px. Titles and subheadings may vary within that range, but must never exceed 28px.
- Navigation: desktop uses a persistent left sidebar across authenticated pages; mobile uses a fixed bottom navigation bar.
- Responsive contract: every feature, container, route, modal, table, media surface, and form must be designed mobile-first, then expanded through explicit Tailwind breakpoints and media-query-aware layout decisions.
- Database: Supabase Postgres with Drizzle ORM migrations and schema definitions.
- Auth: Supabase SSR utilities with cookie-backed sessions.
- Payments: Paystack checkout and callback verification before account activation.
- Storage: Supabase Storage buckets for image, video, and audio uploads.
- Currency rules: `100 credits = $0.50 USD`; `$1.00 USD = NGN 1,000`.

## Responsive Layout Rules

- Mobile first: build the smallest screen behavior first, then scale up.
- Mobile navigation: all primary authenticated routes are reachable from a fixed bottom navigation bar with touch-friendly targets.
- Desktop navigation: all primary authenticated routes live in a persistent left sidebar; page content is offset so no surface is hidden under navigation.
- Feed layout: desktop keeps the vertical video/feed column sticky and independently scrollable, matching the TikTok desktop interaction model while adjacent panels can scroll normally.
- Mobile feed layout: the feed takes priority, uses snap-style vertical sections where appropriate, and keeps actions reachable by thumb.
- Breakpoints: use explicit `sm`, `md`, `lg`, `xl`, and `2xl` decisions for grids, tables, drawers, modals, wallet cards, admin tables, and profile grids.
- Tables: desktop can use dense data tables; mobile must use compressed rows, stacked rows, or sheets instead of overflowing horizontal content.
- Modals and panels: desktop may use centered modals or side sheets; mobile must use full-width bottom sheets or full-screen flows where space is constrained.
- Media: image, video, and audio post surfaces must preserve aspect ratio and avoid layout shifts across viewport sizes.

## Typography Rules

- Font family: DM Sans across the full platform.
- Maximum type size: 28px.
- Body text: 11px for default labels, metadata, helper text, table cells, feed captions, and routine UI copy.
- Header text: 16px for section headers, panel titles, navigation labels that need emphasis, modal titles, and compact card headings.
- Titles: may scale between 20px and 28px depending on hierarchy and available space.
- Subheadings: may scale between 12px and 16px depending on density and context.
- Numbers: wallet balances and high-priority metrics may use up to 28px; secondary KPI values should usually stay at 16px or 22px.
- No viewport-width font scaling. Breakpoints may adjust layout and spacing, not push type above the 28px ceiling.

## Phase 1: Foundation and Design System

Goals:
- Replace starter UI with the production visual foundation.
- Install runtime and database packages.
- Establish global tokens, font, glass surfaces, and layout conventions.
- Establish the 11px body, 16px header, and 28px maximum typography hierarchy.
- Add Drizzle config and initial schema spine.
- Establish the persistent desktop sidebar and mobile bottom navigation model.
- Define responsive layout rules before feature pages are built.

Deliverables:
- Responsive app shell with feed, wallet, tasks, leaderboard, profile, and admin preview states.
- Desktop sidebar navigation and mobile bottom navigation foundation.
- TikTok-style sticky vertical feed preview for desktop.
- Shared conversion utilities for credits, USD, and Naira.
- Supabase browser and server client helpers.
- Implementation docs and checklist.

## Phase 2: Auth, Paywall, and Onboarding

Goals:
- Gate new users behind Paystack.
- Verify payment server-side before profile activation.
- Force activated users through compulsory profile onboarding.
- Generate branded referral URLs immediately after onboarding.

Core routes:
- `/activate`
- `/api/paystack/initialize`
- `/api/paystack/callback`
- `/onboarding`
- `/ref/[code]`

Data:
- `profiles`
- payment ledger table
- referral attribution table

## Phase 3: Vertical Feed, Media Engine, and Profiles

Goals:
- Build the immersive vertical feed for mobile and desktop.
- Keep the desktop feed vertically scrollable and sticky, with post actions fixed to the feed surface.
- Keep the mobile feed optimized for thumb interaction and bottom navigation clearance.
- Support image + caption, video + caption, and image + MP3 uploads.
- Add post likes, bookmarks, comments, and moderation status.
- Show the rotating vinyl indicator for active image + audio posts.
- Add reusable profile post grids for self profiles and public user profiles.
- Let users view other creators' profiles from feed posts, comments, leaderboards, referrals, and search/discovery surfaces.

Core routes:
- `/feed`
- `/upload`
- `/posts/[id]`
- `/profile`
- `/u/[username]`

Data:
- `posts`
- `post_likes`
- `post_bookmarks`
- `post_comments`
- profile post grid query
- public profile summary query
- media storage metadata

Profile behavior:
- A user's own profile shows profile stats, referral URL access, wallet-oriented creator status, and a grid of all posts they have shared.
- Public profiles show safe public creator details, follow/share/referral actions where applicable, and a grid of that creator's published posts.
- Post grids must support image, video, and image + audio posts with clear media-type indicators.
- Desktop profile pages should use the sidebar shell; mobile profile pages should reserve safe space for the bottom nav.

## Phase 4: Viral Share and Referral Loops

Goals:
- Copy the user's branded referral URL to clipboard on share.
- Trigger native share sheet with generated caption and hashtags.
- Track referral source and conversion after signup payment.

Core logic:
- Web Share API with clipboard fallback.
- Caption template service.
- Referral attribution persistence.

## Phase 5: Sponsored Tasks, Watch-Time, and Credits

Goals:
- Add sponsored video task dashboard.
- Award credits only when milestones are crossed.
- Show instant toast notifications, not continuous playback tickers.
- Enforce daily caps and grey out completed or exhausted task cards.

Data:
- `sponsored_tasks`
- `task_progress`
- `credit_ledger`
- admin watch-time cap setting

## Phase 6: Wallet, Withdrawals, and Payout Locks

Goals:
- Build master balance with NGN default and USD toggle.
- Show exactly four KPI cards: referral earnings, sponsored tasks earnings, available withdrawal, total withdrawn.
- Enforce referral earnings as always withdrawable.
- Lock sponsored earnings until admin unlock or the third Saturday fallback.
- Add withdrawal request modal and admin review workflow.

Data:
- `withdrawals`
- `credit_ledger`
- payout unlock settings

## Phase 7: Admin Management Platform

Goals:
- Build paginated user directory with earning range and percentile filters.
- Add bulk crediting, removing, suspending, deleting, and point deduction.
- Add moderation hub with publish/delete actions and rejection messages.
- Add leaderboard scoring configuration for strict and flexible modes.
- Add platform controls for credit allocation, feature toggles, notifications, email blasts, badges, and under-construction mode.

Core routes:
- `/admin`
- `/admin/users`
- `/admin/moderation`
- `/admin/leaderboard`
- `/admin/platform`

## Phase 8: Hardening and Launch

Goals:
- Add RLS policies, storage policies, audit logging, and admin permission checks.
- Add loading, empty, error, and offline states.
- Run accessibility, mobile, desktop, and performance passes.
- Run responsive QA across small mobile, large mobile, tablet, laptop, desktop, and wide desktop breakpoints.
- Add integration tests for payment, credits, withdrawal locks, sharing, and moderation.
- Prepare production environment variables and deployment checklist.

## Security Notes

- Never expose Supabase service role keys to the browser.
- Keep admin authorization in server-validated data, not user-editable metadata.
- Enable RLS on public Supabase tables before exposing data to clients.
- Verify Paystack callbacks server-side before activating accounts.
- Store withdrawal and credit changes in an append-only ledger.
