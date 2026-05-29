INSERT INTO "storage"."buckets" ("id", "name", "public", "file_size_limit", "allowed_mime_types")
VALUES
  ('task-media', 'task-media', true, 104857600, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm', 'video/quicktime'])
ON CONFLICT ("id") DO UPDATE
SET "public" = EXCLUDED."public",
    "file_size_limit" = EXCLUDED."file_size_limit",
    "allowed_mime_types" = EXCLUDED."allowed_mime_types";

DROP POLICY IF EXISTS "task_media_select_public" ON "storage"."objects";
DROP POLICY IF EXISTS "task_media_admin_insert" ON "storage"."objects";
DROP POLICY IF EXISTS "task_media_admin_update" ON "storage"."objects";
DROP POLICY IF EXISTS "task_media_admin_delete" ON "storage"."objects";

CREATE POLICY "task_media_select_public" ON "storage"."objects" FOR SELECT TO anon, authenticated USING ("bucket_id" = 'task-media');

CREATE POLICY "task_media_admin_insert" ON "storage"."objects" FOR INSERT TO authenticated WITH CHECK (
  "bucket_id" = 'task-media'
  AND "private"."is_admin"()
);

CREATE POLICY "task_media_admin_update" ON "storage"."objects" FOR UPDATE TO authenticated USING (
  "bucket_id" = 'task-media'
  AND "private"."is_admin"()
) WITH CHECK (
  "bucket_id" = 'task-media'
  AND "private"."is_admin"()
);

CREATE POLICY "task_media_admin_delete" ON "storage"."objects" FOR DELETE TO authenticated USING (
  "bucket_id" = 'task-media'
  AND "private"."is_admin"()
);
