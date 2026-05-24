ALTER TABLE "badges" ADD COLUMN IF NOT EXISTS "image_url" text;--> statement-breakpoint
INSERT INTO "storage"."buckets" ("id", "name", "public", "file_size_limit", "allowed_mime_types")
VALUES
  ('badge-images', 'badge-images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'])
ON CONFLICT ("id") DO UPDATE
SET "public" = EXCLUDED."public",
    "file_size_limit" = EXCLUDED."file_size_limit",
    "allowed_mime_types" = EXCLUDED."allowed_mime_types";--> statement-breakpoint
CREATE POLICY "badge_images_select_public" ON "storage"."objects" FOR SELECT TO anon, authenticated USING ("bucket_id" = 'badge-images');--> statement-breakpoint
CREATE POLICY "badge_images_admin_insert" ON "storage"."objects" FOR INSERT TO authenticated WITH CHECK (
  "bucket_id" = 'badge-images'
  AND "private"."is_admin"()
);--> statement-breakpoint
CREATE POLICY "badge_images_admin_update" ON "storage"."objects" FOR UPDATE TO authenticated USING (
  "bucket_id" = 'badge-images'
  AND "private"."is_admin"()
) WITH CHECK (
  "bucket_id" = 'badge-images'
  AND "private"."is_admin"()
);--> statement-breakpoint
CREATE POLICY "badge_images_admin_delete" ON "storage"."objects" FOR DELETE TO authenticated USING (
  "bucket_id" = 'badge-images'
  AND "private"."is_admin"()
);
