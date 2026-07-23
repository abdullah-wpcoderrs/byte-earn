-- Keep signup activation locked unless Paystack confirms the exact stored fee and currency.
CREATE OR REPLACE FUNCTION "private"."mark_signup_payment_result"(
  "target_reference" text,
  "next_status" "public"."signup_payment_status",
  "next_amount_kobo" integer,
  "next_currency" text,
  "next_paid_at" timestamp with time zone,
  "next_provider_message" text
)
RETURNS TABLE (
  "payment_id" uuid,
  "profile_id" uuid,
  "payment_status" "public"."signup_payment_status",
  "profile_status" "public"."account_status"
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  payment_row "public"."signup_payments"%ROWTYPE;
  resolved_profile_status "public"."account_status";
BEGIN
  SELECT *
  INTO payment_row
  FROM "public"."signup_payments"
  WHERE "reference" = "target_reference"
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Payment reference not found.';
  END IF;

  IF payment_row."status" = 'success' THEN
    RETURN QUERY
    SELECT
      payment_row."id",
      payment_row."profile_id",
      payment_row."status",
      profile."status"
    FROM "public"."profiles" AS profile
    WHERE profile."id" = payment_row."profile_id";
    RETURN;
  END IF;

  IF "next_status" = 'success' AND (
    "next_amount_kobo" IS DISTINCT FROM payment_row."amount_kobo"
    OR UPPER(COALESCE("next_currency", '')) IS DISTINCT FROM UPPER(payment_row."currency")
  ) THEN
    RAISE EXCEPTION 'Payment amount or currency mismatch.';
  END IF;

  UPDATE "public"."signup_payments"
  SET "amount_kobo" = COALESCE("next_amount_kobo", payment_row."amount_kobo"),
      "currency" = COALESCE(NULLIF("next_currency", ''), payment_row."currency"),
      "paid_at" = "next_paid_at",
      "provider_message" = COALESCE(NULLIF("next_provider_message", ''), payment_row."provider_message"),
      "status" = "next_status",
      "updated_at" = now()
  WHERE "id" = payment_row."id";

  resolved_profile_status := CASE
    WHEN "next_status" = 'success' THEN 'onboarding'::"public"."account_status"
    ELSE (
      SELECT "status"
      FROM "public"."profiles"
      WHERE "id" = payment_row."profile_id"
    )
  END;

  IF "next_status" = 'success' THEN
    PERFORM set_config('app.trusted_profile_update', 'true', true);

    UPDATE "public"."profiles"
    SET "status" = 'onboarding',
        "updated_at" = now()
    WHERE "id" = payment_row."profile_id"
      AND "status" = 'pending_payment';

    SELECT "status"
    INTO resolved_profile_status
    FROM "public"."profiles"
    WHERE "id" = payment_row."profile_id";
  END IF;

  RETURN QUERY
  SELECT
    payment_row."id",
    payment_row."profile_id",
    "next_status",
    resolved_profile_status;
END;
$$;