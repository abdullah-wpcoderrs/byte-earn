# byte-earn Task Checklist

## Phase 1: Foundation and Design System

- [x] Inspect existing Next.js scaffold.
- [x] Install Lucide React, Supabase, Drizzle, and Postgres packages.
- [x] Apply DM Sans globally.
- [x] Add typography hierarchy: 11px body, 16px headers, 28px maximum.
- [x] Define dark blue glassmorphic theme tokens.
- [x] Enforce 5px radius across global controls and surfaces.
- [x] Replace starter page with responsive product foundation.
- [x] Add initial Drizzle config.
- [x] Add initial Supabase client helpers.
- [x] Add credit conversion utilities.
- [x] Add desktop sidebar navigation foundation.
- [x] Add mobile bottom navigation foundation.
- [x] Add profile post grid preview foundation.
- [x] Add reusable Button, Input, Select, Modal, Toast, and Sheet components.
- [x] Add responsive authenticated app layout.
- [x] Extract sidebar and mobile bottom nav into reusable layout components.
- [x] Add responsive breakpoint QA checklist to every route implementation.
- [x] Add typography QA to verify no product text exceeds 28px.
- [x] Add under-construction intercept page shell.

## Phase 2: Auth, Paywall, and Onboarding

- [x] Replace root page with responsive auth gateway UI.
- [x] Create Supabase auth flow.
- [x] Add Paystack payment initialization endpoint.
- [x] Add Paystack callback verification endpoint.
- [x] Persist successful signup payments.
- [x] Activate users after verified payment.
- [x] Redirect activated users to compulsory onboarding.
- [x] Build profile and bank detail onboarding form.
- [x] Generate unique referral code and branded referral URL.
- [x] Add RLS policies for profiles and payment records.

## Phase 3: Vertical Feed and Media Engine

- [x] Build vertical feed route.
- [x] Add responsive feed viewport behavior for mobile and desktop.
- [x] Keep desktop feed sticky and independently vertically scrollable.
- [x] Add mobile feed safe spacing for the bottom navigation bar.
- [x] Add image + caption upload.
- [x] Add video + caption upload.
- [x] Add image + MP3 upload.
- [x] Add active audio post vinyl indicator.
- [x] Add like, bookmark, and comment interactions.
- [x] Add sliding comment panel.
- [x] Build own-profile route with all existing posts in a grid.
- [x] Build public user profile route with published posts in a grid.
- [x] Link feed author handles and avatars to public profiles.
- [x] Link comments, leaderboards, and referrals to public profiles where relevant.
- [x] Add media-type badges for image, video, and image + audio profile grid items.
- [x] Optimize profile grids for 3-column mobile and denser desktop layouts.
- [ ] Add media storage buckets and policies.

## Phase 4: Viral Share and Referral Loops

- [x] Add referral URL clipboard copy on share.
- [x] Trigger native share sheet.
- [x] Add generated caption and hashtag template.
- [x] Add share fallback for unsupported browsers.
- [x] Track referral visits.
- [x] Attribute paid activations to referring users.

## Phase 5: Sponsored Tasks and Watch-Time Credits

- [x] Build sponsored tasks dashboard.
- [x] Add task playback milestone detection.
- [x] Add milestone credit award events.
- [x] Show earned-credit toast notifications only at milestones.
- [x] Enforce admin daily watch-time cap.
- [x] Grey out exhausted task milestone cards.
- [x] Stop toast awards after daily cap is exhausted.

## Phase 6: Wallet and Withdrawals

- [x] Build master balance card with NGN default.
- [x] Add USD primary display toggle.
- [x] Add exactly four wallet KPI cards.
- [x] Implement referral earnings as always withdrawable.
- [x] Implement sponsored earnings admin unlock.
- [x] Implement third Saturday fallback unlock.
- [x] Add withdrawal request modal.
- [x] Add withdrawal server action and ledger entries.
- [ ] Add admin withdrawal review states.

## Phase 7: Admin Management Platform

- [ ] Build paginated user directory.
- [ ] Build the admin route in a protected /admin and let it have its own auth and role auth permission verification before authenticating.
- [ ] Add this user as admin and run the migration "abdullahajibowu0@gmail.com" Password: "Welcome+13"
- [ ] Add earning range filters.
- [ ] Add percentile rank filters from referral counts.
- [ ] Add row checkboxes and bulk action menu.
- [ ] Implement bulk crediting.
- [ ] Implement bulk removing.
- [ ] Implement bulk suspending.
- [ ] Implement bulk deleting.
- [ ] Implement bulk point deduction.
- [ ] Build moderation hub.
- [ ] Add global post approval toggle.
- [ ] Add publish/delete moderation actions.
- [ ] Notify authors when posts are rejected.
- [ ] Build leaderboard criteria checklist.
- [ ] Add strict and flexible leaderboard modes.
- [ ] Reconfigure user and admin leaderboard UI from active mode.
- [ ] Add platform notification tools.
- [ ] Add HTML email blast module.
- [ ] Add custom badge creation tools.
- [ ] Add under-construction global switch.

## Phase 8: Hardening and Launch

- [ ] Add audit logging for admin and wallet mutations.
- [ ] Add RLS policies for all exposed public tables.
- [ ] Add storage policies for media assets.
- [ ] Add rate limiting for payments, sharing, comments, and admin actions.
- [ ] Add empty, loading, and error states.
- [ ] Add accessibility pass.
- [ ] Add mobile viewport QA.
- [ ] Add desktop sidebar layout QA.
- [ ] Add mobile bottom navigation QA.
- [ ] Add profile grid responsive QA.
- [ ] Test breakpoints for small mobile, large mobile, tablet, laptop, desktop, and wide desktop.
- [ ] Add build and lint gates.
- [ ] Add payment, wallet, referral, and moderation tests.
- [ ] Add production deployment checklist.
