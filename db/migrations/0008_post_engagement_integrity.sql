ALTER TABLE "post_likes" ADD CONSTRAINT "post_likes_post_profile_unique" UNIQUE ("post_id", "profile_id");--> statement-breakpoint
ALTER TABLE "post_bookmarks" ADD CONSTRAINT "post_bookmarks_post_profile_unique" UNIQUE ("post_id", "profile_id");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "posts_status_created_at_idx" ON "posts" ("status", "created_at");--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "post_comments_post_created_at_idx" ON "post_comments" ("post_id", "created_at");
