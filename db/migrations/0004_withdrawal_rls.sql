ALTER TABLE "withdrawals" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "withdrawals_select_own" ON "withdrawals" FOR SELECT TO authenticated USING ("profile_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "withdrawals_insert_own" ON "withdrawals" FOR INSERT TO authenticated WITH CHECK ("profile_id" = auth.uid());
