CREATE SCHEMA IF NOT EXISTS "private";--> statement-breakpoint
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'referral_attribution_status') THEN
    CREATE TYPE "public"."referral_attribution_status" AS ENUM('pending', 'qualified', 'rejected');
  END IF;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "reward_rules" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "action" text NOT NULL,
  "label" text NOT NULL,
  "credits" integer DEFAULT 0 NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "description" text DEFAULT '' NOT NULL,
  "updated_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "reward_rules_action_unique" UNIQUE ("action"),
  CONSTRAINT "reward_rules_credits_nonnegative" CHECK ("credits" >= 0)
);
--> statement-breakpoint
ALTER TABLE "reward_rules" ADD CONSTRAINT "reward_rules_updated_by_profiles_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "reward_rules" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "reward_rules_select_authenticated" ON "reward_rules";
--> statement-breakpoint
CREATE POLICY "reward_rules_select_authenticated" ON "reward_rules" FOR SELECT TO authenticated USING (true);
--> statement-breakpoint
DROP POLICY IF EXISTS "reward_rules_admin_all" ON "reward_rules";
--> statement-breakpoint
CREATE POLICY "reward_rules_admin_all" ON "reward_rules" FOR ALL TO authenticated USING ("private"."is_admin"()) WITH CHECK ("private"."is_admin"());
--> statement-breakpoint
INSERT INTO "reward_rules" ("action", "label", "credits", "enabled", "description")
VALUES
  ('referral_qualified', 'Qualified referral', 100, true, 'Awarded once when a referred user completes activation and onboarding.'),
  ('sponsored_task_milestone', 'Sponsored task milestone', 0, true, 'Fallback platform rule; task-specific rewards remain on sponsored_tasks.reward_credits.'),
  ('watch_time_milestone', 'Watch-time milestone', 0, false, 'Reserved for platform-wide watch-time rewards after anti-abuse rules are finalized.'),
  ('admin_credit', 'Admin credit', 0, true, 'Manual admin-issued credits with an audit reason.'),
  ('admin_adjustment', 'Admin adjustment', 0, true, 'Manual admin corrections and deductions with an audit reason.')
ON CONFLICT ("action") DO NOTHING;
--> statement-breakpoint
ALTER TABLE "referral_attributions" ADD COLUMN IF NOT EXISTS "status" "public"."referral_attribution_status" DEFAULT 'pending' NOT NULL;
--> statement-breakpoint
ALTER TABLE "referral_attributions" ADD COLUMN IF NOT EXISTS "qualified_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "referral_attributions" ADD COLUMN IF NOT EXISTS "reward_credits" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "referral_attributions" ADD COLUMN IF NOT EXISTS "rejection_reason" text;
--> statement-breakpoint
UPDATE "referral_attributions"
SET "status" = 'rejected',
    "rejection_reason" = COALESCE("rejection_reason", 'Missing or self referral.')
WHERE "status" = 'pending'
  AND ("referrer_id" IS NULL OR "referrer_id" = "referred_profile_id");
--> statement-breakpoint
WITH ranked AS (
  SELECT
    "id",
    row_number() OVER (PARTITION BY "referred_profile_id" ORDER BY "created_at", "id") AS "rank"
  FROM "referral_attributions"
  WHERE "status" <> 'rejected'
)
UPDATE "referral_attributions" AS "ra"
SET "status" = 'rejected',
    "rejection_reason" = COALESCE("ra"."rejection_reason", 'Duplicate referral attribution.')
FROM ranked
WHERE "ra"."id" = ranked."id"
  AND ranked."rank" > 1;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "referral_attributions_one_open_per_referred_idx"
ON "referral_attributions" ("referred_profile_id")
WHERE "status" <> 'rejected';
--> statement-breakpoint
ALTER TABLE "referral_attributions" DROP CONSTRAINT IF EXISTS "referral_attributions_no_self_referral";
--> statement-breakpoint
ALTER TABLE "referral_attributions" ADD CONSTRAINT "referral_attributions_no_self_referral" CHECK ("status" = 'rejected' OR "referrer_id" IS NULL OR "referrer_id" <> "referred_profile_id") NOT VALID;
--> statement-breakpoint
ALTER TABLE "referral_attributions" DROP CONSTRAINT IF EXISTS "referral_attributions_pending_requires_referrer";
--> statement-breakpoint
ALTER TABLE "referral_attributions" ADD CONSTRAINT "referral_attributions_pending_requires_referrer" CHECK ("status" = 'rejected' OR "referrer_id" IS NOT NULL) NOT VALID;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "private"."protect_profile_sensitive_fields"()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF current_setting('app.trusted_profile_update', true) = 'true' THEN
    RETURN NEW;
  END IF;

  IF auth.uid() IS NULL OR "private"."is_admin"() THEN
    RETURN NEW;
  END IF;

  IF OLD."id" = auth.uid()
    AND OLD."status" = 'onboarding'
    AND NEW."status" = 'active'
    AND OLD."role" = NEW."role"
    AND OLD."referral_code" = NEW."referral_code"
    AND OLD."referred_by" IS NOT DISTINCT FROM NEW."referred_by"
    AND OLD."referral_count" = NEW."referral_count"
    AND OLD."credits_balance" = NEW."credits_balance"
    AND OLD."sponsored_credits_locked" = NEW."sponsored_credits_locked"
  THEN
    RETURN NEW;
  END IF;

  IF OLD."role" IS DISTINCT FROM NEW."role"
    OR OLD."status" IS DISTINCT FROM NEW."status"
    OR OLD."referral_code" IS DISTINCT FROM NEW."referral_code"
    OR OLD."referred_by" IS DISTINCT FROM NEW."referred_by"
    OR OLD."referral_count" IS DISTINCT FROM NEW."referral_count"
    OR OLD."credits_balance" IS DISTINCT FROM NEW."credits_balance"
    OR OLD."sponsored_credits_locked" IS DISTINCT FROM NEW."sponsored_credits_locked"
  THEN
    RAISE EXCEPTION 'Sensitive profile fields can only be changed by trusted server or admin operations.';
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "private"."qualify_referral_for_profile"("target_profile_id" uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  attribution record;
  reward integer := 0;
  referred_status text;
  referrer_status text;
BEGIN
  SELECT "id", "referrer_id", "referred_profile_id"
  INTO attribution
  FROM "public"."referral_attributions"
  WHERE "referred_profile_id" = "target_profile_id"
    AND "status" = 'pending'
  FOR UPDATE;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  SELECT "status"::text
  INTO referred_status
  FROM "public"."profiles"
  WHERE "id" = attribution."referred_profile_id";

  SELECT "status"::text
  INTO referrer_status
  FROM "public"."profiles"
  WHERE "id" = attribution."referrer_id";

  IF attribution."referrer_id" IS NULL
    OR attribution."referrer_id" = attribution."referred_profile_id"
    OR referred_status IS DISTINCT FROM 'active'
    OR referrer_status IS NULL
    OR referrer_status = 'suspended'
  THEN
    UPDATE "public"."referral_attributions"
    SET "status" = 'rejected',
        "rejection_reason" = 'Referral did not meet qualification rules.'
    WHERE "id" = attribution."id";
    RETURN;
  END IF;

  SELECT COALESCE("credits", 0)
  INTO reward
  FROM "public"."reward_rules"
  WHERE "action" = 'referral_qualified'
    AND "enabled" = true;

  reward := COALESCE(reward, 0);

  UPDATE "public"."referral_attributions"
  SET "status" = 'qualified',
      "qualified_at" = now(),
      "reward_credits" = reward,
      "rejection_reason" = NULL
  WHERE "id" = attribution."id"
    AND "status" = 'pending';

  IF NOT FOUND THEN
    RETURN;
  END IF;

  PERFORM set_config('app.trusted_profile_update', 'true', true);

  UPDATE "public"."profiles"
  SET "referral_count" = "referral_count" + 1,
      "credits_balance" = "credits_balance" + reward,
      "updated_at" = now()
  WHERE "id" = attribution."referrer_id";

  IF reward > 0 THEN
    INSERT INTO "public"."credit_ledger" ("profile_id", "source", "credits", "description")
    VALUES (
      attribution."referrer_id",
      'referral',
      reward,
      'Qualified referral reward'
    );
  END IF;
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "private"."qualify_referral_on_profile_activation"()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  IF NEW."status" = 'active' AND OLD."status" IS DISTINCT FROM NEW."status" THEN
    PERFORM "private"."qualify_referral_for_profile"(NEW."id");
  END IF;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS "qualify_referral_on_profile_activation" ON "public"."profiles";
--> statement-breakpoint
CREATE TRIGGER "qualify_referral_on_profile_activation"
AFTER UPDATE OF "status" ON "public"."profiles"
FOR EACH ROW
EXECUTE FUNCTION "private"."qualify_referral_on_profile_activation"();
--> statement-breakpoint
SELECT "private"."qualify_referral_for_profile"("id")
FROM "public"."profiles"
WHERE "status" = 'active';
