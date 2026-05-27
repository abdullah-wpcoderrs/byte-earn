CREATE TABLE IF NOT EXISTS "public"."system_failures" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "category" text NOT NULL,
  "message" text NOT NULL,
  "metadata" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "public"."system_failures" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "system_failures_admin_select" ON "system_failures";
--> statement-breakpoint
CREATE POLICY "system_failures_admin_select" ON "system_failures"
FOR SELECT TO authenticated
USING ("private"."is_admin"());
--> statement-breakpoint
DROP POLICY IF EXISTS "system_failures_admin_insert" ON "system_failures";
--> statement-breakpoint
CREATE POLICY "system_failures_admin_insert" ON "system_failures"
FOR INSERT TO authenticated
WITH CHECK ("private"."is_admin"());
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "private"."log_system_failure"(
  "failure_category" text,
  "failure_message" text,
  "failure_metadata" text DEFAULT NULL
)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  INSERT INTO "public"."system_failures" ("category", "message", "metadata")
  VALUES ("failure_category", "failure_message", "failure_metadata");
$$;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "private"."log_system_failure"(text, text, text) TO authenticated;
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
  "request_ngn_per_credit_snapshot" numeric,
  "sponsored_unlocked" boolean
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
  referral_credits integer := 0;
  sponsored_credits integer := 0;
  reserved_credits integer := 0;
  current_available_credits integer := 0;
  created_withdrawal_id uuid;
BEGIN
  IF NOT "private"."can_profile_engage"("request_profile_id") THEN
    RAISE EXCEPTION 'Your account cannot request a withdrawal right now.';
  END IF;

  SELECT
    COALESCE(SUM(CASE WHEN "source" = 'referral' THEN "credits" ELSE 0 END), 0),
    COALESCE(SUM(CASE WHEN "source" IN ('sponsored_task', 'watch_time') THEN "credits" ELSE 0 END), 0)
  INTO referral_credits, sponsored_credits
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
    referral_credits + CASE WHEN "sponsored_unlocked" THEN sponsored_credits ELSE 0 END - reserved_credits
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
GRANT EXECUTE ON FUNCTION "private"."request_withdrawal_atomically"(uuid, numeric, integer, text, text, text, integer, numeric, numeric, numeric, boolean) TO authenticated;
