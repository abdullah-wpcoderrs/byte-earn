# User / Profile Route Hardening Checklist

## Goal

- Close the remaining profile, payout, username, and referral security gaps before production.

## Scope

- Protect withdrawal creation from cross-account abuse.
- Enforce the same bank-detail rules across profile edit, onboarding, and withdrawal request flows.
- Prevent reserved usernames from slipping through direct database updates.
- Stop referral-visit spoofing that bypasses the redirect route.

## Implementation Checklist

- [ ] Add shared validation helpers for usernames and payout details.
- [ ] Reuse the shared validation in `app/(app)/profile/actions.ts`.
- [ ] Reuse the shared validation in `app/onboarding/actions.ts`.
- [ ] Reuse the shared validation in `app/(app)/wallet/actions.ts`.
- [ ] Keep the profile and onboarding form hints aligned with the server rules.
- [ ] Add database constraints for `profiles.username` reserved-name blocking.
- [ ] Add database constraints for `profiles.account_number`, `profiles.bank_name`, and `profiles.account_name`.
- [ ] Add database constraints for `withdrawals.account_number`, `withdrawals.bank_name`, and `withdrawals.account_name`.
- [ ] Lock `private.request_withdrawal_atomically()` to the authenticated caller or admin only.
- [ ] Validate payout inputs again inside `private.request_withdrawal_atomically()` so direct RPC calls cannot bypass app checks.
- [ ] Remove public `referral_visits` inserts and move trusted inserts to a server-controlled path.
- [ ] Update `app/ref/[code]/route.ts` to log visits through the admin client after passing the anti-spoofing checks.
- [ ] Add focused regression coverage for the new hardening points.
- [ ] Run diagnostics and the targeted test/build checks after the code changes.

## Files Expected To Change

- `app/(app)/profile/actions.ts`
- `app/(app)/profile/page.tsx`
- `app/(app)/wallet/actions.ts`
- `app/onboarding/actions.ts`
- `app/onboarding/page.tsx`
- `app/ref/[code]/route.ts`
- `db/migrations/*.sql`
- `db/schema.ts`
- `lib/supabase/admin.ts` or a shared validation helper in `lib/`
- `tests/phase8-smoke.test.mjs`

## Verification

- `npm test`
- `npm run build`
- Editor diagnostics on the touched files
