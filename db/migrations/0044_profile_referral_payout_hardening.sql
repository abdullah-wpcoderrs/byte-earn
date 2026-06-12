ALTER TABLE "public"."profiles"
DROP CONSTRAINT IF EXISTS "profiles_username_not_reserved";

ALTER TABLE "public"."profiles"
ADD CONSTRAINT "profiles_username_not_reserved"
CHECK (
  "username" IS NULL
  OR lower("username") <> ALL (
    ARRAY[
      'admin',
      'administrator',
      'wallet',
      'feed',
      'tasks',
      'profile',
      'u',
      'ref',
      'auth',
      'api',
      'notifications',
      'onboarding',
      'activate',
      'under-construction',
      'settings',
      'login',
      'logout',
      'signup',
      'register',
      'support',
      'help',
      'info',
      'contact'
    ]::text[]
  )
);

-- Clean old payout values so the new checks do not fail on legacy rows.
UPDATE "public"."profiles"
SET "bank_name" = NULLIF(regexp_replace(btrim("bank_name"), '\s+', ' ', 'g'), '')
WHERE "bank_name" IS NOT NULL;

UPDATE "public"."profiles"
SET "account_name" = NULLIF(regexp_replace(btrim("account_name"), '\s+', ' ', 'g'), '')
WHERE "account_name" IS NOT NULL;

UPDATE "public"."profiles"
SET "account_number" = NULLIF(btrim("account_number"), '')
WHERE "account_number" IS NOT NULL;

UPDATE "public"."profiles"
SET "bank_name" = NULL
WHERE "bank_name" IS NOT NULL
  AND char_length("bank_name") NOT BETWEEN 2 AND 100;

UPDATE "public"."profiles"
SET "account_name" = NULL
WHERE "account_name" IS NOT NULL
  AND char_length("account_name") NOT BETWEEN 2 AND 100;

UPDATE "public"."profiles"
SET "account_number" = NULL
WHERE "account_number" IS NOT NULL
  AND btrim("account_number") !~ '^[0-9]{10}$';

ALTER TABLE "public"."profiles"
DROP CONSTRAINT IF EXISTS "profiles_bank_name_length";

ALTER TABLE "public"."profiles"
ADD CONSTRAINT "profiles_bank_name_length"
CHECK (
  "bank_name" IS NULL
  OR char_length(btrim("bank_name")) BETWEEN 2 AND 100
);

ALTER TABLE "public"."profiles"
DROP CONSTRAINT IF EXISTS "profiles_account_name_length";

ALTER TABLE "public"."profiles"
ADD CONSTRAINT "profiles_account_name_length"
CHECK (
  "account_name" IS NULL
  OR char_length(btrim("account_name")) BETWEEN 2 AND 100
);

ALTER TABLE "public"."profiles"
DROP CONSTRAINT IF EXISTS "profiles_account_number_nuban";

ALTER TABLE "public"."profiles"
ADD CONSTRAINT "profiles_account_number_nuban"
CHECK (
  "account_number" IS NULL
  OR btrim("account_number") ~ '^[0-9]{10}$'
);

ALTER TABLE "public"."withdrawals"
DROP CONSTRAINT IF EXISTS "withdrawals_bank_name_length";

ALTER TABLE "public"."withdrawals"
ADD CONSTRAINT "withdrawals_bank_name_length"
CHECK (char_length(btrim("bank_name")) BETWEEN 2 AND 100);

ALTER TABLE "public"."withdrawals"
DROP CONSTRAINT IF EXISTS "withdrawals_account_name_length";

ALTER TABLE "public"."withdrawals"
ADD CONSTRAINT "withdrawals_account_name_length"
CHECK (char_length(btrim("account_name")) BETWEEN 2 AND 100);

ALTER TABLE "public"."withdrawals"
DROP CONSTRAINT IF EXISTS "withdrawals_account_number_nuban";

ALTER TABLE "public"."withdrawals"
ADD CONSTRAINT "withdrawals_account_number_nuban"
CHECK (btrim("account_number") ~ '^[0-9]{10}$');

DO $$
BEGIN
  IF to_regclass('public.referral_visits') IS NOT NULL THEN
    EXECUTE 'DROP POLICY IF EXISTS "referral_visits_insert_public" ON "public"."referral_visits"';
  END IF;
END
$$;

REVOKE EXECUTE ON FUNCTION "private"."request_withdrawal_atomically"(uuid, numeric, integer, text, text, text, integer, numeric, numeric, numeric) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION "private"."request_withdrawal_atomically"(uuid, numeric, integer, text, text, text, integer, numeric, numeric, numeric) FROM anon;
REVOKE EXECUTE ON FUNCTION "private"."request_withdrawal_atomically"(uuid, numeric, integer, text, text, text, integer, numeric, numeric, numeric) FROM authenticated;

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
  normalized_bank_name text := regexp_replace(btrim("request_bank_name"), '\s+', ' ', 'g');
  normalized_account_number text := btrim("request_account_number");
  normalized_account_name text := regexp_replace(btrim("request_account_name"), '\s+', ' ', 'g');
BEGIN
  IF auth.uid() IS DISTINCT FROM "request_profile_id" AND NOT "private"."is_admin"() THEN
    RAISE EXCEPTION 'not_authorized';
  END IF;

  IF normalized_bank_name IS NULL OR char_length(normalized_bank_name) < 2 OR char_length(normalized_bank_name) > 100 THEN
    RAISE EXCEPTION 'invalid_bank_name';
  END IF;

  IF normalized_account_number IS NULL OR normalized_account_number !~ '^[0-9]{10}$' THEN
    RAISE EXCEPTION 'invalid_account_number';
  END IF;

  IF normalized_account_name IS NULL OR char_length(normalized_account_name) < 2 OR char_length(normalized_account_name) > 100 THEN
    RAISE EXCEPTION 'invalid_account_name';
  END IF;

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
    normalized_bank_name,
    normalized_account_number,
    normalized_account_name,
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

GRANT EXECUTE ON FUNCTION "private"."request_withdrawal_atomically"(uuid, numeric, integer, text, text, text, integer, numeric, numeric, numeric) TO authenticated;
