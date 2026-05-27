ALTER TABLE "posts" ADD COLUMN IF NOT EXISTS "impressions_count" integer DEFAULT 0 NOT NULL;
