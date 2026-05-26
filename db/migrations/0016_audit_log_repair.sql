DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'audit_actor_type') THEN
    CREATE TYPE "public"."audit_actor_type" AS ENUM('user', 'admin', 'system');
  END IF;
END $$;
--> statement-breakpoint
CREATE TABLE IF NOT EXISTS "audit_logs" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "actor_id" uuid,
  "actor_type" "audit_actor_type" DEFAULT 'user' NOT NULL,
  "action" text NOT NULL,
  "entity_type" text NOT NULL,
  "entity_id" text,
  "metadata" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "audit_logs" DROP CONSTRAINT IF EXISTS "audit_logs_actor_id_profiles_id_fk";
--> statement-breakpoint
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_profiles_id_fk" FOREIGN KEY ("actor_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "audit_logs" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "audit_logs_admin_select" ON "audit_logs";
--> statement-breakpoint
CREATE POLICY "audit_logs_admin_select" ON "audit_logs" FOR SELECT TO authenticated USING ("private"."is_admin"());
--> statement-breakpoint
DROP POLICY IF EXISTS "audit_logs_admin_insert" ON "audit_logs";
--> statement-breakpoint
CREATE POLICY "audit_logs_admin_insert" ON "audit_logs" FOR INSERT TO authenticated WITH CHECK ("private"."is_admin"() OR "actor_id" = auth.uid());
--> statement-breakpoint
