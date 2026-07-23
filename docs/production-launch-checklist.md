# Production Launch Checklist

## Environment

- Set `NEXT_SUPABASE_URL` or `NEXT_PUBLIC_SUPABASE_URL`.
- Set `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Set `SUPABASE_POSTGRES_URL` to the Supabase Postgres connection string only for Drizzle migrations.
- Set `NEXT_PUBLIC_APP_URL` to the production origin.
- Set `PAYSTACK_SECRET_KEY` for server-side Paystack transaction initialization and verification.
- Set `NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY` only if the client uses Paystack InlineJS/Popup directly.
- Confirm `PAYSTACK_ACTIVATION_ENABLED=true` for paid launch.

## Database

- Run all journaled migrations through `0046_public_withdrawal_rpc_wrapper.sql`.
- Confirm `0043`, `0044`, `0045`, and `0046` are present in the migration journal and applied in the hosted database.
- Confirm `private.is_admin()` exists in the private schema.
- Confirm `public.request_withdrawal_atomically()` is callable by an authenticated user and rejects another profile ID.
- Confirm every public table has RLS enabled.
- Confirm `post-images`, `post-videos`, and `post-audio` buckets exist with the expected MIME and size limits.
- Confirm the `task-media` and `badge-images` buckets exist before enabling sponsored tasks or badge uploads.
- Promote the intended admin account after the auth user exists.

## Security

- Confirm no service-role or secret key uses a `NEXT_PUBLIC_` prefix.
- Run Supabase advisors after migrations.
- Review storage policies by uploading to the signed-in user's own folder and rejecting another user's folder.
- Confirm admin pages redirect non-admin users.
- Confirm withdrawal review transitions reject invalid state jumps.

## QA Gates

- Run `npm run lint`.
- Run `npm run test`.
- Run `npm run build`.
- Run `npm run qa` before deployment.
- Verify responsive breakpoints: 360, 430, 768, 1024, 1440, and 1728px.

## Product Checks

- Sign up, activate, onboard, and land in feed.
- Copy/share referral link and verify visit attribution.
- Request a withdrawal and review it through pending, approved, and paid.
- Review a pending post through publish and reject paths.
- Toggle under-construction mode and confirm the intended redirect behavior before exposing it publicly.
