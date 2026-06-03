-- Runtime contract for Adsterra stats reconciliation and CPAGrip postback storage.
DROP INDEX IF EXISTS "public"."sponsored_task_provider_events_stats_unique";

DO $$ BEGIN
  IF to_regclass('public.sponsored_task_provider_events') IS NOT NULL THEN
    CREATE UNIQUE INDEX IF NOT EXISTS "sponsored_task_provider_events_stats_unique"
    ON "public"."sponsored_task_provider_events" ("provider","session_id","stats_date");
  END IF;
END $$;

UPDATE "public"."sponsored_tasks"
SET "provider_tracking_param" = 'psid',
    "provider_reconciliation_mode" = 'api_reconciliation',
    "provider_status" = CASE
      WHEN "provider_status" = 'not_configured' THEN 'needs_api_reconciliation'
      ELSE "provider_status"
    END,
    "updated_at" = now()
WHERE "provider"::text = 'adsterra';

UPDATE "public"."sponsored_tasks"
SET "provider_tracking_param" = 'subid',
    "provider_reconciliation_mode" = 'postback',
    "provider_status" = CASE
      WHEN "provider_status" = 'not_configured' THEN 'postback_required'
      ELSE "provider_status"
    END,
    "updated_at" = now()
WHERE "provider"::text = 'cpagrip';
