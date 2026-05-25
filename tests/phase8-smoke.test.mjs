import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

function test(name, fn) {
  try {
    fn();
    console.log(`ok - ${name}`);
  } catch (error) {
    console.error(`not ok - ${name}`);
    throw error;
  }
}

test("payment routes are server-priced, rate-limited, and audited", () => {
  const initialize = read("app/api/paystack/initialize/route.ts");
  const callback = read("app/api/paystack/callback/route.ts");

  assert.match(initialize, /SIGNUP_FEE_KOBO/);
  assert.match(initialize, /checkRateLimit/);
  assert.match(initialize, /payment\.initialized/);
  assert.match(callback, /verifyPaystackTransaction/);
  assert.match(callback, /checkRateLimit/);
  assert.match(callback, /payment\.verified/);
});

test("wallet and moderation mutations have audit and transition guards", () => {
  const wallet = read("app/(app)/wallet/actions.ts");
  const adminActions = read("app/admin/actions.ts");

  assert.match(wallet, /wallet:withdrawal/);
  assert.match(wallet, /withdrawal\.requested/);
  assert.match(adminActions, /invalid_transition/);
  assert.match(adminActions, /admin\.withdrawal/);
  assert.match(adminActions, /admin\.post/);
});

test("referral tracking and admin actions have rate limits", () => {
  const referral = read("app/ref/[code]/route.ts");
  const adminActions = read("app/admin/actions.ts");

  assert.match(referral, /checkRateLimit/);
  assert.match(adminActions, /admin:bulk-users/);
  assert.match(adminActions, /admin:moderation/);
});

test("referral rewards are qualified server-side and idempotently", () => {
  const migration = read("db/migrations/0011_referral_rewards.sql");
  const authActions = read("app/auth/actions.ts");

  assert.match(migration, /CREATE TABLE IF NOT EXISTS "reward_rules"/);
  assert.match(migration, /'referral_qualified'/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION "private"\."qualify_referral_for_profile"/);
  assert.match(migration, /FOR UPDATE/);
  assert.match(migration, /"status" = 'pending'/);
  assert.match(migration, /"referral_count" = "referral_count" \+ 1/);
  assert.match(migration, /"credit_ledger"/);
  assert.match(migration, /AFTER UPDATE OF "status" ON "public"\."profiles"/);
  assert.match(authActions, /referrer\?\.id && referrer\.id !== data\.user\.id/);
});

test("finance settings drive server-side credit conversion", () => {
  const migration = read("db/migrations/0012_finance_settings.sql");
  const money = read("lib/money.ts");
  const walletActions = read("app/(app)/wallet/actions.ts");
  const adminActions = read("app/admin/actions.ts");
  const rewardsPage = read("app/admin/rewards/page.tsx");
  const rewardControls = read("app/admin/rewards/reward-controls.tsx");

  assert.match(migration, /CREATE TABLE IF NOT EXISTS "finance_settings"/);
  assert.match(migration, /"credits_per_unit"/);
  assert.match(migration, /"ngn_per_credit_snapshot"/);
  assert.match(money, /getNgnPerCredit/);
  assert.match(walletActions, /getActiveFinanceSettings/);
  assert.match(walletActions, /nairaToCredits\(amountNaira, financeSettings\)/);
  assert.match(walletActions, /ngn_per_credit_snapshot/);
  assert.match(adminActions, /updateFinanceSettingsAction/);
  assert.match(adminActions, /admin\.finance_settings\.updated/);
  assert.match(rewardsPage, /RewardControls/);
  assert.match(rewardControls, /Credit conversion/);
  assert.match(rewardControls, /Modal/);
  assert.match(rewardControls, /maxCreditsPerAction/);
  assert.match(adminActions, /assertRewardRuleAllowsCredits/);
  assert.match(adminActions, /admin_credit/);
  assert.match(adminActions, /admin_adjustment/);
});

test("task rewards are loaded from configured reward rules", () => {
  const tasksPage = read("app/(app)/tasks/page.tsx");
  const tasksData = read("lib/tasks-data.ts");
  const taskPlayer = read("components/tasks/sponsored-task-player.tsx");

  assert.match(tasksPage, /getConfiguredSponsoredTasks/);
  assert.match(tasksData, /sponsored_task_milestone/);
  assert.match(tasksData, /watch_time_milestone/);
  assert.match(taskPlayer, /watchTimeBonusCredits/);
});

test("admins bypass payment and onboarding gates", () => {
  const middleware = read("lib/supabase/middleware.ts");
  const authActions = read("app/auth/actions.ts");
  const activatePage = read("app/activate/page.tsx");
  const onboardingPage = read("app/onboarding/page.tsx");
  const paystackInitialize = read("app/api/paystack/initialize/route.ts");

  assert.match(middleware, /const isAdmin = profile\.role === "admin"/);
  assert.match(middleware, /isRoute\(pathname, "\/activate"\) \|\| isRoute\(pathname, "\/onboarding"\)/);
  assert.match(authActions, /profile\.role === "admin"/);
  assert.match(activatePage, /profile\.role === "admin"/);
  assert.match(onboardingPage, /profile\.role === "admin"/);
  assert.match(paystackInitialize, /profile\.role === "admin"/);
});

test("admin user creation uses server-only Supabase admin auth", () => {
  const adminClient = read("lib/supabase/admin.ts");
  const adminActions = read("app/admin/actions.ts");
  const usersTable = read("app/admin/users/user-management-table.tsx");

  assert.match(adminClient, /import "server-only"/);
  assert.match(adminClient, /SUPABASE_SERVICE_ROLE_KEY/);
  assert.match(adminActions, /auth\.admin\.createUser/);
  assert.match(adminActions, /auth\.admin\.updateUserById/);
  assert.match(adminActions, /public\.profiles|from\("profiles"\)/);
  assert.match(usersTable, /createAdminUserAction/);
});

test("hardening migration includes audit, RLS, and storage policies", () => {
  const migration = read("db/migrations/0007_phase8_hardening.sql");
  const moderationHardening = read("db/migrations/0014_admin_moderation_hardening.sql");

  assert.match(migration, /CREATE TABLE "audit_logs"/);
  assert.match(migration, /"private"\."is_admin"/);
  assert.match(migration, /protect_profile_sensitive_fields/);
  assert.match(migration, /ALTER TABLE "posts" ENABLE ROW LEVEL SECURITY/);
  assert.match(migration, /INSERT INTO "storage"\."buckets"/);
  assert.match(migration, /post_media_insert_own_folder/);
  assert.match(moderationHardening, /recipient_profile_id/);
  assert.match(moderationHardening, /posts_insert_own_respects_approval/);
  assert.match(moderationHardening, /posts_update_own_pending_only/);
  assert.match(moderationHardening, /post_approval_required/);
});
