ALTER TABLE "email_blasts" ADD COLUMN IF NOT EXISTS "status" text DEFAULT 'draft' NOT NULL;--> statement-breakpoint
ALTER TABLE "email_blasts" ADD COLUMN IF NOT EXISTS "sent_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "email_blasts" ADD COLUMN IF NOT EXISTS "failed_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "email_blasts" ADD COLUMN IF NOT EXISTS "error_message" text;--> statement-breakpoint
ALTER TABLE "email_blasts" ADD COLUMN IF NOT EXISTS "recipient_count" integer DEFAULT 0 NOT NULL;--> statement-breakpoint
CREATE SCHEMA IF NOT EXISTS "private";--> statement-breakpoint
CREATE OR REPLACE FUNCTION "private"."is_admin"()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM "public"."profiles"
    WHERE "id" = auth.uid()
      AND "role" = 'admin'
      AND "status" <> 'suspended'
  );
$$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "notification_reads" (
  "notification_id" uuid NOT NULL REFERENCES "public"."platform_notifications"("id") ON DELETE CASCADE,
  "profile_id" uuid NOT NULL REFERENCES "public"."profiles"("id") ON DELETE CASCADE,
  "read_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "notification_reads_notification_id_profile_id_pk" PRIMARY KEY ("notification_id", "profile_id")
);
--> statement-breakpoint
ALTER TABLE "notification_reads" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP POLICY IF EXISTS "notification_reads_select_own_or_admin" ON "notification_reads";--> statement-breakpoint
CREATE POLICY "notification_reads_select_own_or_admin" ON "notification_reads" FOR SELECT TO authenticated USING ("profile_id" = auth.uid() OR "private"."is_admin"());--> statement-breakpoint
DROP POLICY IF EXISTS "notification_reads_insert_own_or_admin" ON "notification_reads";--> statement-breakpoint
CREATE POLICY "notification_reads_insert_own_or_admin" ON "notification_reads" FOR INSERT TO authenticated WITH CHECK ("profile_id" = auth.uid() OR "private"."is_admin"());--> statement-breakpoint
DROP POLICY IF EXISTS "notification_reads_delete_own_or_admin" ON "notification_reads";--> statement-breakpoint
CREATE POLICY "notification_reads_delete_own_or_admin" ON "notification_reads" FOR DELETE TO authenticated USING ("profile_id" = auth.uid() OR "private"."is_admin"());--> statement-breakpoint
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE "platform_notifications";
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
