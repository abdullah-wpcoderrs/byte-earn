# Implementation Task Tracker

## Scope

Update the feed, single post detail page, and profile editing flow so captions, analytics, and author display names behave correctly and securely.

## Requirements

### Feed page caption behavior

- On `/feed`, keep the media surface clean and minimal.
- Show only a short caption preview inside or over the media card.
- Truncate long captions to a few characters so they do not obstruct the media.
- Keep mobile post cards especially minimal.

### Single post detail caption behavior

- On the single post detail page, do not show the full caption inside the media component.
- Render the full caption below the media component.
- Render analytics below the caption only when the logged-in user owns the post.

### Single post analytics visibility

- Analytics must only be visible to the author of the post.
- If the logged-in user is not the author, do not render the analytics component.
- If there is no logged-in user, do not render the analytics component.
- Do not expose analytics data to non-owners through page props, server logic, actions, or API responses.
- Enforce ownership on the server before loading or returning analytics data.

### Profile username field

- Add a new `username` field to user profiles.
- Users should be able to add or update their username from their profile.
- Usernames should be shown as the author name on `/feed`.
- Usernames should be shown as the author name on the single post detail page.
- Post author IDs should not be shown as display names in feed or single post UI.
- Username should have validation rules before saving.
- Username should be unique if the database does not already enforce uniqueness.

### Profile editing

- Users should be able to edit their profile.
- Users can edit full name.
- Users can edit username.
- Users cannot edit email.
- Email may be displayed as read-only if needed, but it must not be submitted as an editable field.
- Profile updates must be authorized so users can only update their own profile.

## Implementation Checklist

### Discovery

- [ ] Locate the feed page and feed card/media components.
- [ ] Locate the single post detail route and related analytics component.
- [ ] Locate profile page, profile form, profile server actions, and profile database schema.
- [ ] Confirm how the current user/session is loaded.
- [ ] Confirm how post author data is joined or loaded.
- [ ] Confirm how analytics data is fetched.

### Database and schema

- [ ] Add `username` to the profile/user table through a SQL migration.
- [ ] Add a uniqueness constraint or unique index for `username` if applicable.
- [ ] Add a safe username format constraint if applicable.
- [ ] Update `db/schema.ts` manually to match the migration.
- [ ] Provide the SQL migration file for manual execution.

### Feed UI

- [ ] Update feed media/card caption rendering to show only a short preview.
- [ ] Ensure the caption preview does not obstruct media.
- [ ] Replace author ID display with username.
- [ ] Add fallback display logic if username is missing.

### Single post UI

- [ ] Suppress caption rendering inside the media component on the single post page.
- [ ] Render full caption below the media component.
- [ ] Replace author ID display with username.
- [ ] Render analytics below the caption only for the post owner.

### Analytics authorization

- [ ] Compute post ownership using the authenticated user ID and post author ID.
- [ ] Fetch analytics only after ownership is confirmed.
- [ ] Prevent analytics props/data from being passed to non-owner UI.
- [ ] Check analytics actions or endpoints for server-side ownership checks.
- [ ] Add or update server-side authorization if needed.

### Profile editing UI and server logic

- [ ] Add username field to profile edit UI.
- [ ] Keep email read-only or outside the editable form.
- [ ] Allow full name updates.
- [ ] Allow username updates.
- [ ] Validate username before saving.
- [ ] Enforce user can only update their own profile.
- [ ] Show useful errors for invalid or unavailable usernames.

### Admin and Global Settings

- [x] Create Admin UI
  - [x] `app/admin/tasks/page.tsx` (Task list)
  - [x] `app/admin/tasks/create/page.tsx` (Task creation form)
- [x] Add Global Toggle for Sponsored Tasks
  - [x] Add `sponsored_tasks_enabled` to `platform_settings` table
  - [x] Update TypeScript definitions and default settings in `lib/platform-settings.ts`
  - [x] Add toggle switch to Admin settings UI in `app/admin/platform/page.tsx`
  - [x] Parse and update `sponsored_tasks_enabled` in `app/admin/actions.ts`
  - [x] Implement custom waiting state screen on `/tasks` page when toggle is off
  - [x] Add Tasks pages link to desktop and mobile admin navigation sidebars

### Verification

- [ ] Run diagnostics.
- [ ] Run lint/typecheck if available.
- [ ] Run production build because this touches integrated app behavior.
- [ ] Manually verify feed caption truncation.
- [ ] Manually verify single post caption placement.
- [ ] Manually verify analytics are visible for owner only.
- [ ] Manually verify analytics are hidden for non-owner and logged-out users.
- [ ] Manually verify profile full name and username editing.
- [ ] Manually verify email cannot be edited.

## Acceptance Criteria

- `/feed` displays a short non-obstructive caption preview.
- Single post page displays the full caption below the media.
- Single post media does not duplicate the full caption inside the media component.
- Analytics appear only when the logged-in user owns the post.
- Analytics data is not exposed to non-owners.
- User profiles support `username`.
- Feed and single post pages show username instead of user ID.
- Users can edit full name and username only.
- Users cannot edit email.
- Database migration and `db/schema.ts` stay aligned.
- Diagnostics and production build pass.
