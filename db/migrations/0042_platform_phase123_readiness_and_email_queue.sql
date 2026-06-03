ALTER TABLE "public"."email_blasts"
  ADD COLUMN IF NOT EXISTS "recipient_snapshot" text,
  ADD COLUMN IF NOT EXISTS "failed_recipient_snapshot" text,
  ADD COLUMN IF NOT EXISTS "send_cursor" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "failed_recipient_count" integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "processing_started_at" timestamptz,
  ADD COLUMN IF NOT EXISTS "last_processed_at" timestamptz;

UPDATE "public"."email_blasts"
SET
  "failed_recipient_snapshot" = COALESCE("failed_recipient_snapshot", '[]'),
  "recipient_snapshot" = COALESCE("recipient_snapshot", NULL),
  "send_cursor" = COALESCE("send_cursor", 0),
  "failed_recipient_count" = COALESCE("failed_recipient_count", 0);
