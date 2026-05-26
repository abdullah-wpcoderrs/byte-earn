CREATE TABLE IF NOT EXISTS "profile_badges" (
  "profile_id" uuid NOT NULL REFERENCES "public"."profiles"("id") ON DELETE CASCADE,
  "badge_id" uuid NOT NULL REFERENCES "public"."badges"("id") ON DELETE CASCADE,
  "assigned_by" uuid REFERENCES "public"."profiles"("id") ON DELETE SET NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "profile_badges_profile_id_badge_id_pk" PRIMARY KEY ("profile_id", "badge_id")
);
--> statement-breakpoint
ALTER TABLE "profile_badges" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "profile_badges_select_authenticated" ON "profile_badges";
--> statement-breakpoint
CREATE POLICY "profile_badges_select_authenticated" ON "profile_badges" FOR SELECT TO authenticated USING (true);
--> statement-breakpoint
DROP POLICY IF EXISTS "profile_badges_admin_all" ON "profile_badges";
--> statement-breakpoint
CREATE POLICY "profile_badges_admin_all" ON "profile_badges" FOR ALL TO authenticated USING ("private"."is_admin"()) WITH CHECK ("private"."is_admin"());
--> statement-breakpoint
