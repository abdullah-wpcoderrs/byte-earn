-- Store start-session geography for provider mismatch review.
ALTER TABLE "public"."task_sessions"
  ADD COLUMN IF NOT EXISTS "country_code" text;

CREATE INDEX IF NOT EXISTS "task_sessions_country_task_created_at_idx"
  ON "public"."task_sessions" USING btree ("country_code", "task_id", "created_at");

CREATE INDEX IF NOT EXISTS "sponsored_task_provider_events_country_idx"
  ON "public"."sponsored_task_provider_events" USING btree ("provider", "country_code", "created_at");
