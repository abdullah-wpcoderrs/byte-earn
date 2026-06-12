ALTER TABLE "public"."platform_settings" ADD COLUMN IF NOT EXISTS "referral_withdrawals_unlocked" boolean DEFAULT true NOT NULL;
ALTER TABLE "public"."platform_settings" ADD COLUMN IF NOT EXISTS "watch_time_withdrawals_unlocked" boolean DEFAULT false NOT NULL;
ALTER TABLE "public"."platform_settings" ADD COLUMN IF NOT EXISTS "admin_credit_withdrawals_unlocked" boolean DEFAULT true NOT NULL;
ALTER TABLE "public"."platform_settings" ADD COLUMN IF NOT EXISTS "adjustment_withdrawals_unlocked" boolean DEFAULT true NOT NULL;

--> statement-breakpoint

DROP FUNCTION IF EXISTS "private"."request_withdrawal_atomically"(uuid, numeric, integer, text, text, text, integer, numeric, numeric, numeric, boolean);

--> statement-breakpoint

CREATE OR REPLACE FUNCTION "private"."request_withdrawal_atomically"(
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
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  current_settings "public"."platform_settings"%ROWTYPE;
  referral_credits integer := 0;
  sponsored_credits integer := 0;
  watch_time_credits integer := 0;
  admin_credits integer := 0;
  adjustment_credits integer := 0;
  reserved_credits integer := 0;
  current_available_credits integer := 0;
  created_withdrawal_id uuid;
BEGIN
  IF NOT "private"."can_profile_engage"("request_profile_id") THEN
    RAISE EXCEPTION 'Your account cannot request a withdrawal right now.';
  END IF;

  SELECT * INTO current_settings FROM "public"."platform_settings" LIMIT 1;

  SELECT
    COALESCE(SUM(CASE WHEN "source" = 'referral' THEN "credits" ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN "source" = 'sponsored_task' THEN "credits" ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN "source" = 'watch_time' THEN "credits" ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN "source" = 'admin_credit' THEN "credits" ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN "source" = 'adjustment' THEN "credits" ELSE 0 END), 0)
  INTO referral_credits, sponsored_credits, watch_time_credits, admin_credits, adjustment_credits
  FROM "public"."credit_ledger"
  WHERE "profile_id" = "request_profile_id";

  SELECT COALESCE(SUM("amount_credits"), 0)
  INTO reserved_credits
  FROM "public"."withdrawals"
  WHERE "profile_id" = "request_profile_id"
    AND "status" IN ('pending', 'approved', 'paid')
  FOR UPDATE;

  current_available_credits := GREATEST(
    0,
    (CASE WHEN current_settings."referral_withdrawals_unlocked" THEN referral_credits ELSE 0 END) +
    (CASE WHEN current_settings."sponsored_withdrawals_unlocked" THEN sponsored_credits ELSE 0 END) +
    (CASE WHEN current_settings."watch_time_withdrawals_unlocked" THEN watch_time_credits ELSE 0 END) +
    (CASE WHEN current_settings."admin_credit_withdrawals_unlocked" THEN admin_credits ELSE 0 END) +
    (CASE WHEN current_settings."adjustment_withdrawals_unlocked" THEN adjustment_credits ELSE 0 END) -
    reserved_credits
  );

  IF "request_amount_credits" > current_available_credits THEN
    RAISE EXCEPTION 'insufficient_available_balance';
  END IF;

  INSERT INTO "public"."withdrawals" (
    "profile_id",
    "amount_naira",
    "amount_credits",
    "bank_name",
    "account_number",
    "account_name",
    "credits_per_unit_snapshot",
    "usd_per_unit_snapshot",
    "ngn_per_usd_snapshot",
    "ngn_per_credit_snapshot"
  )
  VALUES (
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
  )
  RETURNING "id" INTO created_withdrawal_id;

  RETURN QUERY
  SELECT created_withdrawal_id, current_available_credits, "request_amount_credits";
END;
$$;

--> statement-breakpoint

GRANT EXECUTE ON FUNCTION "private"."request_withdrawal_atomically"(uuid, numeric, integer, text, text, text, integer, numeric, numeric, numeric) TO authenticated;
