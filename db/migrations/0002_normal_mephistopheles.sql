CREATE TYPE "public"."task_status" AS ENUM('draft', 'active', 'paused', 'archived');--> statement-breakpoint
CREATE TABLE "referral_visits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"referral_code" text NOT NULL,
	"referrer_id" uuid,
	"visitor_profile_id" uuid,
	"user_agent" text,
	"source" text DEFAULT 'referral_link' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "sponsored_tasks" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"status" "task_status" DEFAULT 'draft' NOT NULL,
	"title" text NOT NULL,
	"sponsor_name" text NOT NULL,
	"video_url" text NOT NULL,
	"thumbnail_url" text,
	"milestone_seconds" integer NOT NULL,
	"reward_credits" integer NOT NULL,
	"daily_cap_seconds" integer DEFAULT 1800 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "task_progress" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"task_id" uuid NOT NULL,
	"profile_id" uuid NOT NULL,
	"watched_seconds" integer DEFAULT 0 NOT NULL,
	"awarded_credits" integer DEFAULT 0 NOT NULL,
	"completed_milestones" integer DEFAULT 0 NOT NULL,
	"cap_exhausted" boolean DEFAULT false NOT NULL,
	"progress_date" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "referral_visits" ADD CONSTRAINT "referral_visits_referrer_id_profiles_id_fk" FOREIGN KEY ("referrer_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_visits" ADD CONSTRAINT "referral_visits_visitor_profile_id_profiles_id_fk" FOREIGN KEY ("visitor_profile_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_progress" ADD CONSTRAINT "task_progress_task_id_sponsored_tasks_id_fk" FOREIGN KEY ("task_id") REFERENCES "public"."sponsored_tasks"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "task_progress" ADD CONSTRAINT "task_progress_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "referral_visits" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "sponsored_tasks" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "task_progress" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "referral_visits_insert_public" ON "referral_visits" FOR INSERT TO anon, authenticated WITH CHECK (true);
--> statement-breakpoint
CREATE POLICY "referral_visits_select_related" ON "referral_visits" FOR SELECT TO authenticated USING ("referrer_id" = auth.uid() OR "visitor_profile_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "sponsored_tasks_select_active" ON "sponsored_tasks" FOR SELECT TO authenticated USING ("status" = 'active');
--> statement-breakpoint
CREATE POLICY "task_progress_select_own" ON "task_progress" FOR SELECT TO authenticated USING ("profile_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "task_progress_insert_own" ON "task_progress" FOR INSERT TO authenticated WITH CHECK ("profile_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "task_progress_update_own" ON "task_progress" FOR UPDATE TO authenticated USING ("profile_id" = auth.uid()) WITH CHECK ("profile_id" = auth.uid());
