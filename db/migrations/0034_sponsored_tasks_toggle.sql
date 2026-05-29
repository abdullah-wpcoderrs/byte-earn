ALTER TABLE "platform_settings" ADD COLUMN IF NOT EXISTS "sponsored_tasks_enabled" boolean DEFAULT false NOT NULL;
