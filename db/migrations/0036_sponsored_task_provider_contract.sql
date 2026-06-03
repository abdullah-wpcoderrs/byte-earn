-- Add Adsterra as the SmartLink provider while keeping Monetag for legacy rows.
DO $$ BEGIN
  ALTER TYPE "public"."task_provider" ADD VALUE IF NOT EXISTS 'adsterra';
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Provider configuration used by admin validation and reconciliation jobs.
ALTER TABLE "public"."sponsored_tasks" ADD COLUMN IF NOT EXISTS "task_type" text DEFAULT 'smartlink' NOT NULL;
ALTER TABLE "public"."sponsored_tasks" ADD COLUMN IF NOT EXISTS "provider_placement_id" text;
ALTER TABLE "public"."sponsored_tasks" ADD COLUMN IF NOT EXISTS "provider_domain_id" text;
ALTER TABLE "public"."sponsored_tasks" ADD COLUMN IF NOT EXISTS "provider_tracking_param" text DEFAULT 'subid' NOT NULL;
ALTER TABLE "public"."sponsored_tasks" ADD COLUMN IF NOT EXISTS "provider_reconciliation_mode" text DEFAULT 'postback' NOT NULL;
ALTER TABLE "public"."sponsored_tasks" ADD COLUMN IF NOT EXISTS "provider_status" text DEFAULT 'not_configured' NOT NULL;

-- Session metadata for cooldowns, expiry, and provider reconciliation.
ALTER TABLE "public"."task_sessions" ADD COLUMN IF NOT EXISTS "tracking_token" text;
ALTER TABLE "public"."task_sessions" ADD COLUMN IF NOT EXISTS "provider_event_id" text;
ALTER TABLE "public"."task_sessions" ADD COLUMN IF NOT EXISTS "pending_expires_at" timestamp with time zone;

CREATE INDEX IF NOT EXISTS "sponsored_tasks_provider_status_idx" ON "public"."sponsored_tasks" USING btree ("provider","status");
CREATE INDEX IF NOT EXISTS "task_sessions_task_profile_status_idx" ON "public"."task_sessions" USING btree ("task_id","profile_id","status");
CREATE INDEX IF NOT EXISTS "task_sessions_pending_expires_at_idx" ON "public"."task_sessions" USING btree ("pending_expires_at");
CREATE UNIQUE INDEX IF NOT EXISTS "task_sessions_tracking_token_unique" ON "public"."task_sessions" ("tracking_token") WHERE "tracking_token" IS NOT NULL;

-- Provider events keep CPAGrip postbacks and Adsterra stats reconciliation auditable.
CREATE TABLE IF NOT EXISTS "public"."sponsored_task_provider_events" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "provider" "public"."task_provider" NOT NULL,
  "event_type" text DEFAULT 'postback' NOT NULL,
  "provider_event_id" text,
  "provider_offer_id" text,
  "session_id" uuid REFERENCES "public"."task_sessions"("id") ON DELETE SET NULL,
  "task_id" uuid REFERENCES "public"."sponsored_tasks"("id") ON DELETE SET NULL,
  "profile_id" uuid REFERENCES "public"."profiles"("id") ON DELETE SET NULL,
  "placement_sub_id" text,
  "payout_amount" numeric(12,4),
  "reported_clicks" integer DEFAULT 0 NOT NULL,
  "reported_impressions" integer DEFAULT 0 NOT NULL,
  "reported_revenue" numeric(12,6),
  "currency" text,
  "ip_address" text,
  "country_code" text,
  "status" text DEFAULT 'received' NOT NULL,
  "raw_payload" text,
  "stats_date" date,
  "processed_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

ALTER TABLE "public"."sponsored_task_provider_events" ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sponsored_task_provider_events_admin_select" ON "public"."sponsored_task_provider_events";
DROP POLICY IF EXISTS "sponsored_task_provider_events_admin_all" ON "public"."sponsored_task_provider_events";

CREATE POLICY "sponsored_task_provider_events_admin_select"
ON "public"."sponsored_task_provider_events"
FOR SELECT TO authenticated
USING ("private"."is_admin"());

CREATE POLICY "sponsored_task_provider_events_admin_all"
ON "public"."sponsored_task_provider_events"
FOR ALL TO authenticated
USING ("private"."is_admin"())
WITH CHECK ("private"."is_admin"());

CREATE INDEX IF NOT EXISTS "sponsored_task_provider_events_session_idx" ON "public"."sponsored_task_provider_events" USING btree ("session_id");
CREATE INDEX IF NOT EXISTS "sponsored_task_provider_events_task_idx" ON "public"."sponsored_task_provider_events" USING btree ("task_id");
CREATE INDEX IF NOT EXISTS "sponsored_task_provider_events_profile_idx" ON "public"."sponsored_task_provider_events" USING btree ("profile_id");
CREATE INDEX IF NOT EXISTS "sponsored_task_provider_events_placement_idx" ON "public"."sponsored_task_provider_events" USING btree ("provider","placement_sub_id");
CREATE UNIQUE INDEX IF NOT EXISTS "sponsored_task_provider_events_provider_event_unique"
ON "public"."sponsored_task_provider_events" ("provider","provider_event_id")
WHERE "provider_event_id" IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS "sponsored_task_provider_events_stats_unique"
ON "public"."sponsored_task_provider_events" ("provider","session_id","stats_date")
WHERE "session_id" IS NOT NULL AND "stats_date" IS NOT NULL;

-- Central reward authority for sponsored task completion.
CREATE OR REPLACE FUNCTION "public"."complete_sponsored_task_session"(
  "session_id_param" uuid,
  "provider_event_id_param" text DEFAULT NULL,
  "raw_payload_param" text DEFAULT NULL,
  "completed_at_param" timestamp with time zone DEFAULT now()
)
RETURNS TABLE (
  "session_id" uuid,
  "task_id" uuid,
  "profile_id" uuid,
  "status" text,
  "reward_credits" integer,
  "already_completed" boolean
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  session_row "public"."task_sessions"%ROWTYPE;
  task_row "public"."sponsored_tasks"%ROWTYPE;
  completed_today integer;
BEGIN
  SELECT *
  INTO session_row
  FROM "public"."task_sessions"
  WHERE "id" = "session_id_param"
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'task_session_not_found';
  END IF;

  SELECT *
  INTO task_row
  FROM "public"."sponsored_tasks"
  WHERE "id" = session_row."task_id"
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'sponsored_task_not_found';
  END IF;

  IF session_row."status" = 'completed' THEN
    "session_id" := session_row."id";
    "task_id" := session_row."task_id";
    "profile_id" := session_row."profile_id";
    "status" := session_row."status"::text;
    "reward_credits" := session_row."reward_credits";
    "already_completed" := true;
    RETURN NEXT;
    RETURN;
  END IF;

  IF session_row."status" <> 'pending' THEN
    RAISE EXCEPTION 'task_session_not_pending';
  END IF;

  IF task_row."global_cap" IS NOT NULL AND task_row."completions_count" >= task_row."global_cap" THEN
    UPDATE "public"."task_sessions"
    SET "status" = 'rejected',
        "updated_at" = now()
    WHERE "id" = session_row."id";
    RAISE EXCEPTION 'task_global_cap_reached';
  END IF;

  SELECT COUNT(*)
  INTO completed_today
  FROM "public"."task_sessions"
  WHERE "task_id" = session_row."task_id"
    AND "profile_id" = session_row."profile_id"
    AND "status" = 'completed'
    AND "completed_at" >= date_trunc('day', "completed_at_param");

  IF completed_today >= task_row."limit_per_user" THEN
    UPDATE "public"."task_sessions"
    SET "status" = 'rejected',
        "updated_at" = now()
    WHERE "id" = session_row."id";
    RAISE EXCEPTION 'task_daily_cap_reached';
  END IF;

  PERFORM set_config('app.trusted_profile_update', 'true', true);

  UPDATE "public"."task_sessions"
  SET "status" = 'completed',
      "reward_credits" = task_row."reward_credits",
      "provider_event_id" = COALESCE("provider_event_id_param", "provider_event_id"),
      "completed_at" = "completed_at_param",
      "updated_at" = now()
  WHERE "id" = session_row."id";

  IF task_row."reward_credits" > 0 THEN
    INSERT INTO "public"."credit_ledger" ("profile_id", "source", "credits", "description")
    VALUES (
      session_row."profile_id",
      'sponsored_task',
      task_row."reward_credits",
      'Completed sponsored task: ' || task_row."title"
    );

    UPDATE "public"."profiles"
    SET "credits_balance" = "credits_balance" + task_row."reward_credits",
        "updated_at" = now()
    WHERE "id" = session_row."profile_id";
  END IF;

  UPDATE "public"."sponsored_tasks"
  SET "completions_count" = "completions_count" + 1,
      "updated_at" = now()
  WHERE "id" = task_row."id";

  IF "provider_event_id_param" IS NOT NULL OR "raw_payload_param" IS NOT NULL THEN
    INSERT INTO "public"."sponsored_task_provider_events" (
      "provider",
      "event_type",
      "provider_event_id",
      "session_id",
      "task_id",
      "profile_id",
      "status",
      "raw_payload",
      "processed_at"
    )
    VALUES (
      task_row."provider",
      CASE WHEN task_row."provider"::text = 'adsterra' THEN 'api_reconciliation' ELSE 'postback' END,
      "provider_event_id_param",
      session_row."id",
      task_row."id",
      session_row."profile_id",
      'rewarded',
      "raw_payload_param",
      now()
    )
    ON CONFLICT DO NOTHING;
  END IF;

  "session_id" := session_row."id";
  "task_id" := task_row."id";
  "profile_id" := session_row."profile_id";
  "status" := 'completed';
  "reward_credits" := task_row."reward_credits";
  "already_completed" := false;
  RETURN NEXT;
END;
$$;

GRANT EXECUTE ON FUNCTION "public"."complete_sponsored_task_session"(uuid, text, text, timestamp with time zone) TO authenticated;
GRANT EXECUTE ON FUNCTION "public"."complete_sponsored_task_session"(uuid, text, text, timestamp with time zone) TO service_role;
