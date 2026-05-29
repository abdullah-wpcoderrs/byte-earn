DO $$ BEGIN
 CREATE TYPE "public"."task_provider" AS ENUM('monetag', 'cpagrip', 'internal');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 CREATE TYPE "public"."task_session_status" AS ENUM('pending', 'completed', 'rejected');
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DROP TABLE "task_progress";
--> statement-breakpoint
ALTER TABLE "sponsored_tasks" DROP COLUMN IF EXISTS "sponsor_name";
--> statement-breakpoint
ALTER TABLE "sponsored_tasks" DROP COLUMN IF EXISTS "video_url";
--> statement-breakpoint
ALTER TABLE "sponsored_tasks" DROP COLUMN IF EXISTS "thumbnail_url";
--> statement-breakpoint
ALTER TABLE "sponsored_tasks" DROP COLUMN IF EXISTS "milestone_seconds";
--> statement-breakpoint
ALTER TABLE "sponsored_tasks" DROP COLUMN IF EXISTS "daily_cap_seconds";
--> statement-breakpoint
ALTER TABLE "sponsored_tasks" ADD COLUMN "provider" "public"."task_provider" DEFAULT 'internal' NOT NULL;
--> statement-breakpoint
ALTER TABLE "sponsored_tasks" ADD COLUMN "description" text;
--> statement-breakpoint
ALTER TABLE "sponsored_tasks" ADD COLUMN "media_url" text;
--> statement-breakpoint
ALTER TABLE "sponsored_tasks" ADD COLUMN "task_url" text;
--> statement-breakpoint
ALTER TABLE "sponsored_tasks" ADD COLUMN "limit_per_user" integer DEFAULT 1 NOT NULL;
--> statement-breakpoint
ALTER TABLE "sponsored_tasks" ADD COLUMN "global_cap" integer;
--> statement-breakpoint
ALTER TABLE "sponsored_tasks" ADD COLUMN "completions_count" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "task_sessions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"provider" "public"."task_provider" NOT NULL,
	"status" "public"."task_session_status" DEFAULT 'pending' NOT NULL,
	"ip_address" text,
	"user_agent" text,
	"reward_credits" integer DEFAULT 0 NOT NULL,
	"completed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "task_sessions" ADD CONSTRAINT "task_sessions_task_id_sponsored_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."sponsored_tasks"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "task_sessions" ADD CONSTRAINT "task_sessions_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "task_sessions_profile_provider_idx" ON "task_sessions" USING btree ("profile_id","provider");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "task_sessions_created_at_idx" ON "task_sessions" USING btree ("created_at");
