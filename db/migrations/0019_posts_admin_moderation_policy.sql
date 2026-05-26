DROP POLICY IF EXISTS "posts_admin_moderation_update" ON "posts";
--> statement-breakpoint
CREATE POLICY "posts_admin_moderation_update" ON "posts"
FOR UPDATE TO authenticated
USING ("private"."is_admin"())
WITH CHECK ("private"."is_admin"());
