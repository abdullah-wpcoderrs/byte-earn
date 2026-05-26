ALTER TABLE "platform_settings" ADD COLUMN IF NOT EXISTS "max_upload_size_mb" integer DEFAULT 50 NOT NULL;
--> statement-breakpoint
ALTER TABLE "platform_settings" DROP CONSTRAINT IF EXISTS "platform_settings_max_upload_size_mb_range";
--> statement-breakpoint
ALTER TABLE "platform_settings" ADD CONSTRAINT "platform_settings_max_upload_size_mb_range" CHECK ("max_upload_size_mb" >= 1 AND "max_upload_size_mb" <= 100);
--> statement-breakpoint
UPDATE "storage"."buckets"
SET "file_size_limit" = 104857600
WHERE "id" IN ('post-images', 'post-videos', 'post-audio');
--> statement-breakpoint
