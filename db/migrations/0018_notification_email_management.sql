ALTER TABLE "platform_notifications" ADD COLUMN IF NOT EXISTS "archived_at" timestamp with time zone;
--> statement-breakpoint
DROP POLICY IF EXISTS "platform_notifications_select_audience_or_recipient" ON "platform_notifications";
--> statement-breakpoint
CREATE POLICY "platform_notifications_select_audience_or_recipient" ON "platform_notifications" FOR SELECT TO authenticated USING (
  "archived_at" IS NULL
  AND (
    "recipient_profile_id" = auth.uid()
    OR (
      "recipient_profile_id" IS NULL
      AND (
        "audience" = 'all'
        OR EXISTS (
          SELECT 1
          FROM "public"."profiles"
          WHERE "id" = auth.uid()
            AND "status"::text = "platform_notifications"."audience"::text
        )
      )
    )
  )
);
--> statement-breakpoint
