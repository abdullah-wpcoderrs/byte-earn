ALTER TABLE "platform_notifications" ADD COLUMN IF NOT EXISTS "recipient_profile_id" uuid;
--> statement-breakpoint
ALTER TABLE "platform_notifications" DROP CONSTRAINT IF EXISTS "platform_notifications_recipient_profile_id_profiles_id_fk";
--> statement-breakpoint
ALTER TABLE "platform_notifications" ADD CONSTRAINT "platform_notifications_recipient_profile_id_profiles_id_fk" FOREIGN KEY ("recipient_profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE ON UPDATE no action;
--> statement-breakpoint
DROP POLICY IF EXISTS "platform_notifications_select_authenticated" ON "platform_notifications";
--> statement-breakpoint
DROP POLICY IF EXISTS "platform_notifications_select_audience" ON "platform_notifications";
--> statement-breakpoint
CREATE POLICY "platform_notifications_select_audience_or_recipient" ON "platform_notifications" FOR SELECT TO authenticated USING (
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
);
--> statement-breakpoint
DROP POLICY IF EXISTS "posts_insert_own" ON "posts";
--> statement-breakpoint
DROP POLICY IF EXISTS "posts_update_own_pending" ON "posts";
--> statement-breakpoint
CREATE POLICY "posts_insert_own_respects_approval" ON "posts" FOR INSERT TO authenticated WITH CHECK (
  "author_id" = auth.uid()
  AND (
    "status" = 'pending'
    OR (
      "status" = 'published'
      AND NOT COALESCE(
        (
          SELECT "post_approval_required"
          FROM "public"."platform_settings"
          ORDER BY "updated_at" DESC
          LIMIT 1
        ),
        true
      )
    )
  )
);
--> statement-breakpoint
CREATE POLICY "posts_update_own_pending_only" ON "posts" FOR UPDATE TO authenticated USING (
  "author_id" = auth.uid()
  AND "status" = 'pending'
) WITH CHECK (
  "author_id" = auth.uid()
  AND "status" = 'pending'
);
--> statement-breakpoint
