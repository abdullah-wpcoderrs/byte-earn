-- Keep review reasons close to the session so admins can act without parsing raw provider payloads.
ALTER TABLE "public"."task_sessions"
  ADD COLUMN IF NOT EXISTS "fraud_reason" text,
  ADD COLUMN IF NOT EXISTS "fraud_metadata" text;

CREATE INDEX IF NOT EXISTS "task_sessions_fraud_reason_idx"
  ON "public"."task_sessions" USING btree ("fraud_reason", "created_at");
