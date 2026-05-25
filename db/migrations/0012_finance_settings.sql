CREATE TABLE IF NOT EXISTS "finance_settings" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "credits_per_unit" integer DEFAULT 100 NOT NULL,
  "usd_per_unit" numeric(12, 4) DEFAULT '0.5000' NOT NULL,
  "ngn_per_usd" numeric(12, 4) DEFAULT '1000.0000' NOT NULL,
  "active" boolean DEFAULT true NOT NULL,
  "updated_by" uuid,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL,
  CONSTRAINT "finance_settings_credits_per_unit_positive" CHECK ("credits_per_unit" > 0),
  CONSTRAINT "finance_settings_usd_per_unit_positive" CHECK ("usd_per_unit" > 0),
  CONSTRAINT "finance_settings_ngn_per_usd_positive" CHECK ("ngn_per_usd" > 0)
);
--> statement-breakpoint
ALTER TABLE "finance_settings" ADD CONSTRAINT "finance_settings_updated_by_profiles_id_fk" FOREIGN KEY ("updated_by") REFERENCES "public"."profiles"("id") ON DELETE SET NULL ON UPDATE no action;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "finance_settings_single_active_idx" ON "finance_settings" ("active") WHERE "active" = true;
--> statement-breakpoint
ALTER TABLE "finance_settings" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
DROP POLICY IF EXISTS "finance_settings_select_authenticated" ON "finance_settings";
--> statement-breakpoint
CREATE POLICY "finance_settings_select_authenticated" ON "finance_settings" FOR SELECT TO authenticated USING (true);
--> statement-breakpoint
DROP POLICY IF EXISTS "finance_settings_admin_all" ON "finance_settings";
--> statement-breakpoint
CREATE POLICY "finance_settings_admin_all" ON "finance_settings" FOR ALL TO authenticated USING ("private"."is_admin"()) WITH CHECK ("private"."is_admin"());
--> statement-breakpoint
INSERT INTO "finance_settings" ("credits_per_unit", "usd_per_unit", "ngn_per_usd", "active")
VALUES (100, '0.5000', '1000.0000', true)
ON CONFLICT DO NOTHING;
--> statement-breakpoint
ALTER TABLE "withdrawals" ADD COLUMN IF NOT EXISTS "credits_per_unit_snapshot" integer;
--> statement-breakpoint
ALTER TABLE "withdrawals" ADD COLUMN IF NOT EXISTS "usd_per_unit_snapshot" numeric(12, 4);
--> statement-breakpoint
ALTER TABLE "withdrawals" ADD COLUMN IF NOT EXISTS "ngn_per_usd_snapshot" numeric(12, 4);
--> statement-breakpoint
ALTER TABLE "withdrawals" ADD COLUMN IF NOT EXISTS "ngn_per_credit_snapshot" numeric(12, 4);
