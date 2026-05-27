ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "shares_count" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "video_watch_seconds_total" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "video_watch_sessions_count" integer DEFAULT 0 NOT NULL;
