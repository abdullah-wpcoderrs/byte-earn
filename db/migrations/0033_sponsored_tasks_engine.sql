-- 1. Create task_provider enum type safely
DO $$ BEGIN
  CREATE TYPE "public"."task_provider" AS ENUM('monetag', 'cpagrip', 'internal');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. Create task_session_status enum type safely
DO $$ BEGIN
  CREATE TYPE "public"."task_session_status" AS ENUM('pending', 'completed', 'rejected');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 3. Drop old task_progress table safely if it exists
DROP TABLE IF EXISTS "task_progress" CASCADE;

-- 4. Drop and re-create sponsored_tasks table safely
DROP TABLE IF EXISTS "sponsored_tasks" CASCADE;
CREATE TABLE "sponsored_tasks" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "provider" "public"."task_provider" DEFAULT 'internal' NOT NULL,
  "status" text DEFAULT 'draft' NOT NULL,
  "title" text NOT NULL,
  "description" text,
  "media_url" text,
  "task_url" text,
  "reward_credits" integer NOT NULL,
  "limit_per_user" integer DEFAULT 1 NOT NULL,
  "global_cap" integer,
  "completions_count" integer DEFAULT 0 NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

-- 5. Create task_sessions table
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

-- 6. Add foreign key constraint for tasks
DO $$ BEGIN
  ALTER TABLE "task_sessions" 
  ADD CONSTRAINT "task_sessions_task_id_sponsored_tasks_id_fk" 
  FOREIGN KEY ("task_id") REFERENCES "public"."sponsored_tasks"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 7. Add foreign key constraint for profiles
DO $$ BEGIN
  ALTER TABLE "task_sessions" 
  ADD CONSTRAINT "task_sessions_profile_id_profiles_id_fk" 
  FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE CASCADE ON UPDATE NO ACTION;
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 8. Create indexes
CREATE INDEX IF NOT EXISTS "task_sessions_profile_provider_idx" ON "task_sessions" USING btree ("profile_id","provider");
CREATE INDEX IF NOT EXISTS "task_sessions_created_at_idx" ON "task_sessions" USING btree ("created_at");

-- 9. Enable Row Level Security (RLS) safely
ALTER TABLE "sponsored_tasks" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "task_sessions" ENABLE ROW LEVEL SECURITY;

-- 10. Drop existing policies if any to avoid duplicates
DROP POLICY IF EXISTS "sponsored_tasks_select_active" ON "sponsored_tasks";
DROP POLICY IF EXISTS "sponsored_tasks_admin_all" ON "sponsored_tasks";
DROP POLICY IF EXISTS "task_sessions_select_own" ON "task_sessions";
DROP POLICY IF EXISTS "task_sessions_insert_own" ON "task_sessions";
DROP POLICY IF EXISTS "task_sessions_update_own" ON "task_sessions";
DROP POLICY IF EXISTS "task_sessions_admin_all" ON "task_sessions";

-- 11. Create new security policies
CREATE POLICY "sponsored_tasks_select_active" ON "sponsored_tasks" FOR SELECT TO authenticated USING ("status" = 'active');
CREATE POLICY "sponsored_tasks_admin_all" ON "sponsored_tasks" FOR ALL TO authenticated USING ("private"."is_admin"()) WITH CHECK ("private"."is_admin"());

CREATE POLICY "task_sessions_select_own" ON "task_sessions" FOR SELECT TO authenticated USING ("profile_id" = auth.uid());
CREATE POLICY "task_sessions_insert_own" ON "task_sessions" FOR INSERT TO authenticated WITH CHECK ("profile_id" = auth.uid());
CREATE POLICY "task_sessions_update_own" ON "task_sessions" FOR UPDATE TO authenticated USING ("profile_id" = auth.uid()) WITH CHECK ("profile_id" = auth.uid());
CREATE POLICY "task_sessions_admin_all" ON "task_sessions" FOR ALL TO authenticated USING ("private"."is_admin"()) WITH CHECK ("private"."is_admin"());
