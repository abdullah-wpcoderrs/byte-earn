-- Expose the guarded private withdrawal function through the public API schema.
-- The private function remains the authority for auth, validation, and balance checks.
CREATE OR REPLACE FUNCTION "public"."request_withdrawal_atomically"(
  "request_profile_id" uuid,
  "request_amount_naira" numeric,
  "request_amount_credits" integer,
  "request_bank_name" text,
  "request_account_number" text,
  "request_account_name" text,
  "request_credits_per_unit_snapshot" integer,
  "request_usd_per_unit_snapshot" numeric,
  "request_ngn_per_usd_snapshot" numeric,
  "request_ngn_per_credit_snapshot" numeric
)
RETURNS TABLE (
  "withdrawal_id" uuid,
  "available_credits" integer,
  "requested_credits" integer
)
LANGUAGE sql
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT *
  FROM "private"."request_withdrawal_atomically"(
    "request_profile_id",
    "request_amount_naira",
    "request_amount_credits",
    "request_bank_name",
    "request_account_number",
    "request_account_name",
    "request_credits_per_unit_snapshot",
    "request_usd_per_unit_snapshot",
    "request_ngn_per_usd_snapshot",
    "request_ngn_per_credit_snapshot"
  );
$$;

REVOKE ALL ON FUNCTION "public"."request_withdrawal_atomically"(uuid, numeric, integer, text, text, text, integer, numeric, numeric, numeric) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION "public"."request_withdrawal_atomically"(uuid, numeric, integer, text, text, text, integer, numeric, numeric, numeric) FROM anon;
GRANT EXECUTE ON FUNCTION "public"."request_withdrawal_atomically"(uuid, numeric, integer, text, text, text, integer, numeric, numeric, numeric) TO authenticated;