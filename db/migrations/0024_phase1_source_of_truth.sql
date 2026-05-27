CREATE OR REPLACE FUNCTION "private"."can_profile_engage"("target_profile_id" uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM "public"."profiles"
    WHERE "id" = "target_profile_id"
      AND "status" = 'active'
  );
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "private"."can_interact_with_post"("target_post_id" uuid, "target_profile_id" uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM "public"."posts"
    WHERE "id" = "target_post_id"
      AND "status" = 'published'
  )
  AND "private"."can_profile_engage"("target_profile_id");
$$;
--> statement-breakpoint
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
--> statement-breakpoint
DROP POLICY IF EXISTS "post_likes_insert_own" ON "post_likes";
--> statement-breakpoint
CREATE POLICY "post_likes_insert_own_published_only" ON "post_likes"
FOR INSERT TO authenticated
WITH CHECK (
  "profile_id" = auth.uid()
  AND "private"."can_interact_with_post"("post_id", "profile_id")
);
--> statement-breakpoint
DROP POLICY IF EXISTS "post_bookmarks_insert_own" ON "post_bookmarks";
--> statement-breakpoint
CREATE POLICY "post_bookmarks_insert_own_published_only" ON "post_bookmarks"
FOR INSERT TO authenticated
WITH CHECK (
  "profile_id" = auth.uid()
  AND "private"."can_interact_with_post"("post_id", "profile_id")
);
--> statement-breakpoint
DROP POLICY IF EXISTS "post_comments_insert_own" ON "post_comments";
--> statement-breakpoint
CREATE POLICY "post_comments_insert_own_published_only" ON "post_comments"
FOR INSERT TO authenticated
WITH CHECK (
  "profile_id" = auth.uid()
  AND "private"."can_interact_with_post"("post_id", "profile_id")
);
