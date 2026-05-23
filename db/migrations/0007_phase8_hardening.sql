CREATE TYPE "public"."audit_actor_type" AS ENUM('user', 'admin', 'system');--> statement-breakpoint
CREATE TABLE "audit_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"actor_id" uuid,
	"actor_type" "audit_actor_type" DEFAULT 'user' NOT NULL,
	"action" text NOT NULL,
	"entity_type" text NOT NULL,
	"entity_id" text,
	"metadata" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_profiles_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_ledger" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "platform_settings" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "posts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
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
CREATE OR REPLACE FUNCTION "private"."protect_profile_sensitive_fields"()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
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
DROP TRIGGER IF EXISTS "protect_profile_sensitive_fields" ON "public"."profiles";--> statement-breakpoint
CREATE TRIGGER "protect_profile_sensitive_fields"
BEFORE UPDATE ON "public"."profiles"
FOR EACH ROW
EXECUTE FUNCTION "private"."protect_profile_sensitive_fields"();
--> statement-breakpoint
CREATE POLICY "profiles_admin_all" ON "profiles" FOR ALL TO authenticated USING ("private"."is_admin"()) WITH CHECK ("private"."is_admin"());--> statement-breakpoint
CREATE POLICY "credit_ledger_select_own" ON "credit_ledger" FOR SELECT TO authenticated USING ("profile_id" = auth.uid() OR "private"."is_admin"());--> statement-breakpoint
CREATE POLICY "credit_ledger_admin_insert" ON "credit_ledger" FOR INSERT TO authenticated WITH CHECK ("private"."is_admin"());--> statement-breakpoint
CREATE POLICY "signup_payments_admin_select" ON "signup_payments" FOR SELECT TO authenticated USING ("private"."is_admin"());--> statement-breakpoint
CREATE POLICY "signup_payments_admin_update" ON "signup_payments" FOR UPDATE TO authenticated USING ("private"."is_admin"()) WITH CHECK ("private"."is_admin"());--> statement-breakpoint
CREATE POLICY "referral_attributions_admin_select" ON "referral_attributions" FOR SELECT TO authenticated USING ("private"."is_admin"());--> statement-breakpoint
CREATE POLICY "referral_attributions_insert_own" ON "referral_attributions" FOR INSERT TO authenticated WITH CHECK ("referred_profile_id" = auth.uid());--> statement-breakpoint
CREATE POLICY "posts_select_published_or_own" ON "posts" FOR SELECT TO authenticated USING ("status" = 'published' OR "author_id" = auth.uid() OR "private"."is_admin"());--> statement-breakpoint
CREATE POLICY "posts_insert_own" ON "posts" FOR INSERT TO authenticated WITH CHECK ("author_id" = auth.uid());--> statement-breakpoint
CREATE POLICY "posts_update_own_pending" ON "posts" FOR UPDATE TO authenticated USING ("author_id" = auth.uid() OR "private"."is_admin"()) WITH CHECK ("author_id" = auth.uid() OR "private"."is_admin"());--> statement-breakpoint
CREATE POLICY "posts_delete_own_or_admin" ON "posts" FOR DELETE TO authenticated USING ("author_id" = auth.uid() OR "private"."is_admin"());--> statement-breakpoint
CREATE POLICY "post_likes_admin_all" ON "post_likes" FOR ALL TO authenticated USING ("private"."is_admin"()) WITH CHECK ("private"."is_admin"());--> statement-breakpoint
CREATE POLICY "post_bookmarks_admin_all" ON "post_bookmarks" FOR ALL TO authenticated USING ("private"."is_admin"()) WITH CHECK ("private"."is_admin"());--> statement-breakpoint
CREATE POLICY "post_comments_admin_all" ON "post_comments" FOR ALL TO authenticated USING ("private"."is_admin"()) WITH CHECK ("private"."is_admin"());--> statement-breakpoint
CREATE POLICY "referral_visits_admin_select" ON "referral_visits" FOR SELECT TO authenticated USING ("private"."is_admin"());--> statement-breakpoint
CREATE POLICY "sponsored_tasks_admin_all" ON "sponsored_tasks" FOR ALL TO authenticated USING ("private"."is_admin"()) WITH CHECK ("private"."is_admin"());--> statement-breakpoint
CREATE POLICY "task_progress_admin_select" ON "task_progress" FOR SELECT TO authenticated USING ("private"."is_admin"());--> statement-breakpoint
CREATE POLICY "withdrawals_admin_all" ON "withdrawals" FOR ALL TO authenticated USING ("private"."is_admin"()) WITH CHECK ("private"."is_admin"());--> statement-breakpoint
CREATE POLICY "platform_settings_select_authenticated" ON "platform_settings" FOR SELECT TO authenticated USING (true);--> statement-breakpoint
CREATE POLICY "platform_settings_admin_all" ON "platform_settings" FOR ALL TO authenticated USING ("private"."is_admin"()) WITH CHECK ("private"."is_admin"());--> statement-breakpoint
DROP POLICY IF EXISTS "platform_notifications_select_authenticated" ON "platform_notifications";--> statement-breakpoint
CREATE POLICY "platform_notifications_select_audience" ON "platform_notifications" FOR SELECT TO authenticated USING (
  "audience" = 'all'
  OR EXISTS (
    SELECT 1
    FROM "public"."profiles"
    WHERE "id" = auth.uid()
      AND "status"::text = "platform_notifications"."audience"::text
  )
);--> statement-breakpoint
CREATE POLICY "platform_notifications_admin_all" ON "platform_notifications" FOR ALL TO authenticated USING ("private"."is_admin"()) WITH CHECK ("private"."is_admin"());--> statement-breakpoint
CREATE POLICY "email_blasts_admin_all" ON "email_blasts" FOR ALL TO authenticated USING ("private"."is_admin"()) WITH CHECK ("private"."is_admin"());--> statement-breakpoint
CREATE POLICY "badges_admin_all" ON "badges" FOR ALL TO authenticated USING ("private"."is_admin"()) WITH CHECK ("private"."is_admin"());--> statement-breakpoint
CREATE POLICY "audit_logs_admin_select" ON "audit_logs" FOR SELECT TO authenticated USING ("private"."is_admin"());--> statement-breakpoint
CREATE POLICY "audit_logs_admin_insert" ON "audit_logs" FOR INSERT TO authenticated WITH CHECK ("private"."is_admin"() OR "actor_id" = auth.uid());--> statement-breakpoint
INSERT INTO "storage"."buckets" ("id", "name", "public", "file_size_limit", "allowed_mime_types")
VALUES
  ('post-images', 'post-images', true, 10485760, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('post-videos', 'post-videos', true, 104857600, ARRAY['video/mp4', 'video/webm', 'video/quicktime']),
  ('post-audio', 'post-audio', true, 20971520, ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/webm'])
ON CONFLICT ("id") DO UPDATE
SET "public" = EXCLUDED."public",
    "file_size_limit" = EXCLUDED."file_size_limit",
    "allowed_mime_types" = EXCLUDED."allowed_mime_types";--> statement-breakpoint
CREATE POLICY "post_media_select_public" ON "storage"."objects" FOR SELECT TO anon, authenticated USING ("bucket_id" IN ('post-images', 'post-videos', 'post-audio'));--> statement-breakpoint
CREATE POLICY "post_media_insert_own_folder" ON "storage"."objects" FOR INSERT TO authenticated WITH CHECK (
  "bucket_id" IN ('post-images', 'post-videos', 'post-audio')
  AND (storage.foldername("name"))[1] = (auth.uid())::text
);--> statement-breakpoint
CREATE POLICY "post_media_update_own_folder" ON "storage"."objects" FOR UPDATE TO authenticated USING (
  "bucket_id" IN ('post-images', 'post-videos', 'post-audio')
  AND (storage.foldername("name"))[1] = (auth.uid())::text
) WITH CHECK (
  "bucket_id" IN ('post-images', 'post-videos', 'post-audio')
  AND (storage.foldername("name"))[1] = (auth.uid())::text
);--> statement-breakpoint
CREATE POLICY "post_media_delete_own_folder" ON "storage"."objects" FOR DELETE TO authenticated USING (
  "bucket_id" IN ('post-images', 'post-videos', 'post-audio')
  AND (storage.foldername("name"))[1] = (auth.uid())::text
);
