DO $$ BEGIN
  ALTER TYPE "public"."task_session_status" ADD VALUE IF NOT EXISTS 'suspicious';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS "task_sessions_ip_task_created_at_idx"
  ON "public"."task_sessions" USING btree ("ip_address", "task_id", "created_at");

CREATE INDEX IF NOT EXISTS "task_sessions_profile_status_created_at_idx"
  ON "public"."task_sessions" USING btree ("profile_id", "status", "created_at");
