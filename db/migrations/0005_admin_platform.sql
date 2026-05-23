CREATE TYPE "public"."notification_audience" AS ENUM('all', 'active', 'suspended');--> statement-breakpoint
CREATE TABLE "platform_notifications" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"title" text NOT NULL,
	"body" text NOT NULL,
	"audience" "notification_audience" DEFAULT 'all' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "email_blasts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"subject" text NOT NULL,
	"html_body" text NOT NULL,
	"audience" "notification_audience" DEFAULT 'all' NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "badges" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"color" text DEFAULT '#5fd7ff' NOT NULL,
	"description" text NOT NULL,
	"created_by" uuid,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "platform_notifications" ADD CONSTRAINT "platform_notifications_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "email_blasts" ADD CONSTRAINT "email_blasts_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "badges" ADD CONSTRAINT "badges_created_by_profiles_id_fk" FOREIGN KEY ("created_by") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "platform_notifications" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "email_blasts" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "badges" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY "platform_notifications_select_authenticated" ON "platform_notifications" FOR SELECT TO authenticated USING (true);--> statement-breakpoint
CREATE POLICY "badges_select_authenticated" ON "badges" FOR SELECT TO authenticated USING (true);--> statement-breakpoint
UPDATE "public"."profiles"
SET "role" = 'admin',
    "status" = 'active',
    "updated_at" = now()
WHERE "id" IN (
  SELECT "id"
  FROM "auth"."users"
  WHERE lower("email") = 'abdullahajibowu0@gmail.com'
);
