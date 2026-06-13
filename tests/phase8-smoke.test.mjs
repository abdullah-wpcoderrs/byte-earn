import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const walletHelpers = await import("../lib/wallet.ts");
const moneyHelpers = await import("../lib/money.ts");

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
  const walletDashboard = read("components/wallet/wallet-dashboard.tsx");
  const adminActions = read("app/admin/actions.ts");
  const walletMath = read("lib/wallet.ts");

  assert.match(wallet, /wallet:withdrawal/);
  assert.match(wallet, /withdrawal\.requested/);
  assert.match(wallet, /validatePayoutDetails/);
  assert.match(wallet, /getAvailableCredits/);
  assert.match(walletDashboard, /Update payout profile/);
  assert.match(walletDashboard, /max=\{maxWithdrawalNaira \|\| 1\}/);
  assert.match(walletMath, /getWithdrawalStatusBreakdown/);
  assert.match(walletMath, /getReservedOrPaidWithdrawalCredits/);
  assert.match(walletMath, /getUnlockedGrossCredits/);
  assert.match(adminActions, /invalid_transition/);
  assert.match(adminActions, /admin\.withdrawal/);
  assert.match(adminActions, /admin\.post/);
});

test("wallet availability math accounts for locked, reserved, paid, and rejected credits", () => {
  const wallet = {
    adjustmentCredits: 100,
    adminCredits: 300,
    referralCredits: 1_000,
    sponsoredCredits: 500,
    watchTimeCredits: 200,
  };
  const allUnlocked = {
    adjustment_withdrawals_unlocked: true,
    admin_credit_withdrawals_unlocked: true,
    referral_withdrawals_unlocked: true,
    sponsored_withdrawals_unlocked: true,
    watch_time_withdrawals_unlocked: true,
  };
  const mixedUnlocks = {
    ...allUnlocked,
    sponsored_withdrawals_unlocked: false,
    watch_time_withdrawals_unlocked: false,
  };

  assert.equal(walletHelpers.getTotalCredits({ ...wallet }), 2_100);
  assert.equal(walletHelpers.getUnlockedGrossCredits(wallet, allUnlocked), 2_100);
  assert.equal(walletHelpers.getAvailableCredits(wallet, allUnlocked, walletHelpers.getWithdrawalStatusBreakdown([])), 2_100);
  assert.equal(walletHelpers.getLockedCredits(wallet, mixedUnlocks), 700);
  assert.equal(walletHelpers.getUnlockedGrossCredits(wallet, mixedUnlocks), 1_400);

  assert.equal(
    walletHelpers.getAvailableCredits(wallet, allUnlocked, walletHelpers.getWithdrawalStatusBreakdown([{ amount_credits: 250, status: "paid" }])),
    1_850,
  );
  assert.equal(walletHelpers.getTotalCredits({ ...wallet }), 2_100);
  assert.equal(
    walletHelpers.getAvailableCredits(wallet, allUnlocked, walletHelpers.getWithdrawalStatusBreakdown([{ amount_credits: 300, status: "pending" }])),
    1_800,
  );
  assert.equal(
    walletHelpers.getAvailableCredits(wallet, allUnlocked, walletHelpers.getWithdrawalStatusBreakdown([{ amount_credits: 400, status: "approved" }])),
    1_700,
  );
  assert.equal(
    walletHelpers.getAvailableCredits(wallet, allUnlocked, walletHelpers.getWithdrawalStatusBreakdown([{ amount_credits: 400, status: "rejected" }])),
    2_100,
  );
  assert.equal(
    walletHelpers.getAvailableCredits(
      wallet,
      mixedUnlocks,
      walletHelpers.getWithdrawalStatusBreakdown([
        { amount_credits: 200, status: "pending" },
        { amount_credits: 150, status: "approved" },
        { amount_credits: 50, status: "paid" },
        { amount_credits: 999, status: "rejected" },
      ]),
    ),
    1_000,
  );
});

test("wallet withdrawal requests use database-authoritative availability and active conversion", () => {
  const walletActions = read("app/(app)/wallet/actions.ts");
  const walletMath = read("lib/wallet.ts");
  const profileHardeningMigration = read("db/migrations/0044_profile_referral_payout_hardening.sql");
  const rate = { creditsPerUnit: 100, ngnPerUsd: 1000, usdPerUnit: 0.5 };

  assert.equal(moneyHelpers.creditsToNaira(100, rate), 500);
  assert.equal(moneyHelpers.nairaToCredits(750, rate), 150);
  assert.match(walletActions, /getAvailableCredits\(wallet, settings, withdrawalStatusBreakdown\)/);
  assert.match(walletActions, /Math\.ceil\(nairaToCredits\(amountNaira, financeSettings\)\)/);
  assert.match(walletActions, /requestedCredits > availableCredits/);
  assert.match(walletActions, /request_withdrawal_atomically/);
  assert.match(walletMath, /Math\.max\(0, getUnlockedGrossCredits\(wallet, settings\) - getReservedOrPaidWithdrawalCredits/);
  assert.match(profileHardeningMigration, /auth\.uid\(\) IS DISTINCT FROM "request_profile_id"/);
  assert.match(profileHardeningMigration, /available_credits/);
  assert.match(profileHardeningMigration, /insufficient_available_balance/);
});

test("mobile sheets and wallet history have responsive structural coverage", () => {
  const sheet = read("components/ui/sheet.tsx");
  const walletHistory = read("app/(app)/wallet/history/page.tsx");

  assert.match(sheet, /createPortal/);
  assert.match(sheet, /document\.body/);
  assert.match(sheet, /fixed inset-0/);
  assert.match(sheet, /aria-modal="true"/);
  assert.match(sheet, /role="dialog"/);
  assert.match(sheet, /env\(safe-area-inset-bottom\)/);
  assert.match(sheet, /app-scrollbar/);
  assert.match(sheet, /onClick=\{onClose\}/);
  assert.match(sheet, /stopPropagation/);
  assert.match(walletHistory, /md:hidden/);
  assert.match(walletHistory, /md:block/);
  assert.match(walletHistory, /WithdrawalStatusBadge/);
  assert.match(walletHistory, /break-words/);
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
  const referralSummary = read("lib/referral-summary.ts");
  const referralList = read("components/profile/referral-list.tsx");

  assert.match(migration, /CREATE TABLE IF NOT EXISTS "reward_rules"/);
  assert.match(migration, /'referral_qualified'/);
  assert.match(migration, /CREATE OR REPLACE FUNCTION "private"\."qualify_referral_for_profile"/);
  assert.match(migration, /FOR UPDATE/);
  assert.match(migration, /"status" = 'pending'/);
  assert.match(migration, /"referral_count" = "referral_count" \+ 1/);
  assert.match(migration, /"credit_ledger"/);
  assert.match(migration, /AFTER UPDATE OF "status" ON "public"\."profiles"/);
  assert.match(authActions, /referrer\?\.id && referrer\.id !== data\.user\.id/);
  assert.match(referralSummary, /rewardRule\?\.enabled === false \? 0/);
  assert.match(referralSummary, /qualifiedCount/);
  assert.match(referralSummary, /referralLedgerCredits/);
  assert.match(referralList, /reward_credits/);
  assert.match(referralList, /qualified_at/);
  assert.match(referralList, /Pending qualification/);
});

test("referral URLs use hosted origins and share captions", () => {
  const share = read("lib/share.ts");
  const profile = read("app/(app)/profile/page.tsx");
  const onboarding = read("app/onboarding/page.tsx");
  const requestOrigin = read("lib/request-origin.ts");

  assert.doesNotMatch(share, /appdomain\.com/);
  assert.match(share, /NEXT_PUBLIC_APP_URL/);
  assert.match(share, /window\.location\.origin/);
  assert.match(share, /buildReferralUrl\(referralCode/);
  assert.match(share, /buildShareCaption/);
  assert.match(profile, /getRequestOrigin/);
  assert.match(onboarding, /getRequestOrigin/);
  assert.match(requestOrigin, /new URL\(process\.env\.NEXT_PUBLIC_APP_URL\)\.origin/);
  assert.match(requestOrigin, /ALLOWED_APP_HOSTS/);
  assert.match(requestOrigin, /normalizeForwardedHost/);
  assert.match(requestOrigin, /x-forwarded-host/);
  assert.doesNotMatch(requestOrigin, /x-forwarded-proto/);
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

test("sponsored task page loads provider tasks and pending session state", () => {
  const tasksPage = read("app/(app)/tasks/page.tsx");
  const tasksData = read("lib/tasks-data.ts");
  const taskEngine = read("components/tasks/task-engine.tsx");
  const taskDetail = read("app/(app)/tasks/[id]/page.tsx");

  assert.match(tasksPage, /getActiveTasks/);
  assert.match(tasksPage, /getUserTaskBackendSummary/);
  assert.match(tasksPage, /getUserVisibleRewardRules/);
  assert.match(tasksPage, /Active tasks/);
  assert.match(tasksPage, /Reward rules/);
  assert.match(tasksPage, /getUserTaskSessionSummary/);
  assert.match(tasksData, /getUserTaskSessionSummary/);
  assert.match(tasksData, /lifetimeSponsoredCredits/);
  assert.match(tasksData, /totalAvailableTaskCredits/);
  assert.match(tasksData, /latestPendingSessionId/);
  assert.match(taskEngine, /Pending verification/);
  assert.match(taskEngine, /router\.refresh/);
  assert.match(taskEngine, /href=\{`\/tasks\/\$\{task\.id\}`\}/);
  assert.match(taskDetail, /Instructions/);
  assert.match(taskDetail, /getUserTaskSessionSummary/);
});

test("Adsterra SmartLink uses psid reconciliation before rewarding", () => {
  const actions = read("app/(app)/tasks/actions.ts");
  const reconcile = read("app/api/tasks/reconcile/adsterra/route.ts");
  const migration = read("db/migrations/0037_adsterra_cpagrip_runtime_contract.sql");

  assert.match(actions, /provider === "adsterra"\) return "psid"/);
  assert.match(actions, /urlObj\.searchParams\.set\(trackingParamForProvider\(task\.provider/);
  assert.match(reconcile, /placement_sub_id/);
  assert.match(reconcile, /complete_sponsored_task_session/);
  assert.match(reconcile, /evaluateProviderSessionRisk/);
  assert.match(migration, /provider_tracking_param" = 'psid'/);
});

test("CPAGrip postbacks are idempotent and risk checked", () => {
  const postback = read("app/api/postback/cpagrip/route.ts");
  const adminTaskActions = read("app/admin/tasks/actions.ts");

  assert.match(postback, /provider_event_id/);
  assert.match(postback, /duplicate/);
  assert.match(postback, /CPAGRIP_POSTBACK_SECRET/);
  assert.match(postback, /evaluateProviderSessionRisk/);
  assert.match(postback, /complete_sponsored_task_session/);
  assert.match(postback, /provider_campaign_mismatch/);
  assert.match(postback, /missing_provider_event_id/);
  assert.match(postback, /sessionRow\.provider !== "cpagrip"/);
  assert.match(postback, /provider_placement_id/);
  assert.match(postback, /recordProviderEvent\("rejected"\)/);
  assert.match(postback, /complete_sponsored_task_session/);
  assert.match(adminTaskActions, /CPAGrip tasks require an offer or campaign ID/);
});

test("sponsored reward RPC is atomic and cap guarded", () => {
  const migration = read("db/migrations/0036_sponsored_task_provider_contract.sql");
  const lockdown = read("db/migrations/0039_sponsored_task_reward_authority_lockdown.sql");
  const reviewMetadata = read("db/migrations/0041_task_session_fraud_review_metadata.sql");

  assert.match(migration, /FOR UPDATE/);
  assert.match(migration, /task_global_cap_reached/);
  assert.match(migration, /task_daily_cap_reached/);
  assert.match(migration, /credit_ledger/);
  assert.match(migration, /credits_balance/);
  assert.match(migration, /completions_count/);
  assert.match(lockdown, /REVOKE EXECUTE ON FUNCTION "public"\."complete_sponsored_task_session".*FROM authenticated/s);
  assert.match(lockdown, /DROP POLICY IF EXISTS "task_sessions_insert_own"/);
  assert.match(lockdown, /DROP POLICY IF EXISTS "task_sessions_update_own"/);
  assert.match(reviewMetadata, /ADD COLUMN IF NOT EXISTS "fraud_reason"/);
  assert.match(reviewMetadata, /ADD COLUMN IF NOT EXISTS "fraud_metadata"/);
});

test("task starts are gated by status, platform toggle, rate limits, and fraud limits", () => {
  const actions = read("app/(app)/tasks/actions.ts");
  const fraud = read("lib/task-fraud.ts");
  const requestMetadata = read("lib/request-metadata.ts");
  const geoMigration = read("db/migrations/0040_provider_geo_fraud_contract.sql");

  assert.match(actions, /\.eq\("status", "active"\)/);
  assert.match(actions, /sponsored_tasks_enabled/);
  assert.match(actions, /assertRateLimit/);
  assert.match(actions, /New accounts have a temporary sponsored task limit/);
  assert.match(actions, /country_code: countryCode/);
  assert.match(fraud, /same_ip_velocity/);
  assert.match(fraud, /provider_country_mismatch/);
  assert.match(fraud, /provider_ip_block_mismatch/);
  assert.match(fraud, /fraud_reason: reason/);
  assert.match(fraud, /fraud_metadata: metadata/);
  assert.match(fraud, /status: "suspicious"/);
  assert.match(requestMetadata, /cf-connecting-ip/);
  assert.match(requestMetadata, /x-vercel-ip-country/);
  assert.match(geoMigration, /ADD COLUMN IF NOT EXISTS "country_code"/);
});

test("internal watch and visit completions require trusted pending sessions", () => {
  const actions = read("app/(app)/tasks/actions.ts");
  const taskEngine = read("components/tasks/task-engine.tsx");
  const watchLimit = read("lib/watch-reward-limit.ts");

  assert.match(actions, /completeInternalWatchTask\(sessionId: string\)/);
  assert.match(actions, /elapsedMs < 30_000/);
  assert.match(actions, /pending_expires_at/);
  assert.match(actions, /Watch session not found/);
  assert.match(actions, /Invalid watch task session/);
  assert.match(actions, /This watch session has expired/);
  assert.match(actions, /today's watch reward limit/);
  assert.match(actions, /getRewardedWatchSecondsToday/);
  assert.match(actions, /Visit session not found/);
  assert.match(actions, /Invalid visit task session/);
  assert.match(actions, /This visit session has expired/);
  assert.doesNotMatch(actions, /watchedSeconds: number/);
  assert.match(taskEngine, /setWatchSessionId\(sessionId\)/);
  assert.match(taskEngine, /completeInternalWatchTask\(watchSessionId\)/);
  assert.match(watchLimit, /sponsored_tasks\(task_type\)/);
  assert.match(watchLimit, /watch_media/);
});

test("platform tools expose readiness checks and queued email delivery", () => {
  const platform = read("app/admin/platform/page.tsx");
  const admin = read("lib/admin.ts");
  const emailActions = read("app/admin/actions.ts");
  const emailRoute = read("app/api/admin/email-blasts/process/route.ts");
  const emailPage = read("app/admin/email-blasts/page.tsx");
  const emailSendForm = read("app/admin/email-blasts/email-blast-send-form.tsx");
  const emailTestModal = read("app/admin/email-blasts/email-blast-test-send-modal.tsx");
  const editor = read("components/admin/rich-text-email-editor.tsx");
  const migration = read("db/migrations/0042_platform_phase123_readiness_and_email_queue.sql");

  assert.match(platform, /Platform readiness/);
  assert.match(platform, /Backend diagnostics/);
  assert.match(platform, /PlatformComposerTools/);
  assert.match(admin, /getPlatformReadiness/);
  assert.match(admin, /getBackendDiagnostics/);
  assert.match(admin, /creditBalanceMismatches/);
  assert.match(admin, /referralCountMismatches/);
  assert.match(admin, /taskCompletionMismatches/);
  assert.match(admin, /providerTotals/);
  assert.match(admin, /badge-images/);
  assert.match(emailActions, /admin\.email_blast\.queued/);
  assert.match(emailActions, /sendPreviewEmailBlastAction/);
  assert.match(emailActions, /sendTestEmailBlastAction/);
  assert.match(emailActions, /admin\.email_blast\.preview_sent/);
  assert.match(emailActions, /admin\.email_blast\.test_sent/);
  assert.match(emailActions, /recipient_snapshot/);
  assert.match(emailRoute, /EMAIL_BLAST_BATCH_SIZE/);
  assert.match(emailRoute, /admin\.email_blast\.sent/);
  assert.match(emailRoute, /admin\.email_blast\.failed/);
  assert.match(emailPage, /EmailBlastComposerModal/);
  assert.match(emailPage, /Preview to me/);
  assert.match(emailSendForm, /\/api\/admin\/email-blasts\/process/);
  assert.match(emailTestModal, /Send test email/);
  assert.match(editor, /HTML source/);
  assert.match(editor, /Email preview/);
  assert.match(migration, /recipient_snapshot/);
  assert.match(migration, /failed_recipient_snapshot/);
});

test("badge admin flow supports editing, safe deletion, and live notification refresh", () => {
  const badgePage = read("app/admin/badges/page.tsx");
  const badgeEditModal = read("app/admin/badges/edit-badge-modal.tsx");
  const badgeDeleteButton = read("app/admin/badges/delete-badge-button.tsx");
  const adminActions = read("app/admin/actions.ts");
  const admin = read("lib/admin.ts");
  const platformPage = read("app/admin/platform/page.tsx");
  const notificationComposer = read("components/admin/notification-composer-modal.tsx");
  const notificationActions = read("app/admin/platform/notification-history-actions.tsx");
  const notifications = read("lib/notifications.ts");
  const bell = read("components/notifications/notification-bell.tsx");
  const adminLayout = read("app/admin/layout.tsx");
  const appLayout = read("app/(app)/layout.tsx");

  assert.match(badgePage, /assignedCount/);
  assert.match(badgeEditModal, /updateBadgeAction/);
  assert.match(badgeDeleteButton, /deleteBadgeAction/);
  assert.match(adminActions, /admin\.badge\.updated/);
  assert.match(adminActions, /admin\.badge\.deleted/);
  assert.match(adminActions, /deliveryMode/);
  assert.match(adminActions, /recipient_profile_id/);
  assert.match(adminActions, /badge_in_use/);
  assert.match(admin, /assignedCount:/);
  assert.match(admin, /getAdminNotificationRecipients/);
  assert.match(platformPage, /Recipient:/);
  assert.match(notificationComposer, /Single user/);
  assert.match(notificationComposer, /recipientProfileId/);
  assert.match(notificationActions, /window\.confirm/);
  assert.match(notifications, /profileId: user\.id/);
  assert.match(bell, /subscriptionId/);
  assert.match(bell, /\.channel\(`notifications:\$\{profileId\}:\$\{subscriptionId\}`\)/);
  assert.match(bell, /platform_notifications/);
  assert.match(bell, /notification_reads/);
  assert.match(adminLayout, /profileId=\{notificationData\.profileId/);
  assert.match(appLayout, /profileId=\{notificationData\.profileId/);
});

test("admin queue and task UI expose aligned review states", () => {
  const adminTasks = read("app/admin/tasks/page.tsx");
  const taskEngine = read("components/tasks/task-engine.tsx");
  const checklist = read("docs/sponsored-task-security-fix-checklist.md");

  assert.match(adminTasks, /fraud_reason/);
  assert.match(adminTasks, /formatReviewReason/);
  assert.match(adminTasks, /country_code/);
  assert.match(taskEngine, /Under review/);
  assert.match(taskEngine, /Pending verification/);
  assert.match(checklist, /Phase 9: Admin Review and UX Alignment/);
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

test("under-construction mode serves a middleware maintenance page while keeping admin access separate", () => {
  const middleware = read("lib/supabase/middleware.ts");
  const authActions = read("app/auth/actions.ts");
  const maintenance = read("lib/under-construction-response.ts");
  const adminLogin = read("app/admin-login/page.tsx");
  const notifications = read("lib/notifications.ts");
  const admin = read("lib/admin.ts");

  assert.match(middleware, /async function isUnderConstructionEnabled/);
  assert.match(middleware, /createUnderConstructionResponse/);
  assert.match(middleware, /createUnderConstructionBlockedResponse/);
  assert.match(middleware, /underConstructionEnabled && !isAdminRoute && !isAdminLoginRoute/);
  assert.match(middleware, /\/admin-login\?auth=required/);
  assert.match(middleware, /redirectUrl\.pathname = "\/feed"/);
  assert.match(authActions, /errorRedirectTo/);
  assert.doesNotMatch(authActions, /under-construction/);
  assert.match(maintenance, /under-construction-illustration\.svg/);
  assert.match(maintenance, /We are coming back soon/);
  assert.match(adminLogin, /Admin sign-in/);
  assert.match(admin, /redirect\("\/admin-login\?auth=required"\)/);
  assert.match(notifications, /\.is\("archived_at", null\)/);
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

test("profile hardening uses shared payout validation, trusted referral logging, and guarded withdrawal RPC", () => {
  const validation = read("lib/profile-validation.ts");
  const profileActions = read("app/(app)/profile/actions.ts");
  const onboardingActions = read("app/onboarding/actions.ts");
  const walletActions = read("app/(app)/wallet/actions.ts");
  const referralRoute = read("app/ref/[code]/route.ts");
  const withdrawalEligibilityMigration = read("db/migrations/0043_withdrawal_eligibility.sql");
  const migration = read("db/migrations/0044_profile_referral_payout_hardening.sql");

  assert.match(validation, /export const RESERVED_USERNAMES/);
  assert.match(validation, /export function validatePayoutDetails/);
  assert.match(validation, /\^\[0-9\]\{10\}\$/);
  assert.match(profileActions, /validatePayoutDetails/);
  assert.match(onboardingActions, /validatePayoutDetails/);
  assert.match(walletActions, /validatePayoutDetails/);
  assert.match(walletActions, /createClient/);
  assert.doesNotMatch(walletActions, /createAdminClient/);
  assert.doesNotMatch(walletActions, /sponsored_unlocked/);
  assert.match(referralRoute, /createAdminClient/);
  assert.match(referralRoute, /adminSupabase\.from\("referral_visits"\)/);
  assert.doesNotMatch(walletActions, /as any/);
  assert.match(withdrawalEligibilityMigration, /ADD COLUMN IF NOT EXISTS "referral_withdrawals_unlocked"/);
  assert.match(withdrawalEligibilityMigration, /ADD COLUMN IF NOT EXISTS "watch_time_withdrawals_unlocked"/);
  assert.match(withdrawalEligibilityMigration, /ADD COLUMN IF NOT EXISTS "admin_credit_withdrawals_unlocked"/);
  assert.match(withdrawalEligibilityMigration, /ADD COLUMN IF NOT EXISTS "adjustment_withdrawals_unlocked"/);
  assert.match(migration, /to_regclass\('public\.referral_visits'\)/);
  assert.match(migration, /DROP POLICY IF EXISTS "referral_visits_insert_public" ON "public"\."referral_visits"/);
  assert.match(migration, /UPDATE "public"\."profiles"/);
  assert.match(migration, /SET "bank_name" = NULLIF\(regexp_replace\(btrim\("bank_name"\), '\\s\+', ' ', 'g'\), ''\)/);
  assert.match(migration, /SET "account_number" = NULLIF\(btrim\("account_number"\), ''\)/);
  assert.match(migration, /WHERE "account_number" IS NOT NULL[\s\S]*btrim\("account_number"\) !~ '\^\[0-9\]\{10\}\$'/);
  assert.match(migration, /auth\.uid\(\) IS DISTINCT FROM "request_profile_id"/);
  assert.match(migration, /GRANT EXECUTE ON FUNCTION "private"\."request_withdrawal_atomically"\(uuid, numeric, integer, text, text, text, integer, numeric, numeric, numeric\) TO authenticated/);
  assert.doesNotMatch(migration, /request_withdrawal_atomically"\(uuid, numeric, integer, text, text, text, integer, numeric, numeric, numeric, boolean\) TO authenticated/);
  assert.match(migration, /profiles_username_not_reserved/);
  assert.match(migration, /withdrawals_account_number_nuban/);
});

test("username availability checks reject invalid entries and back the live username UI", () => {
  const validation = read("lib/profile-validation.ts");
  const authActions = read("app/auth/actions.ts");
  const profileActions = read("app/(app)/profile/actions.ts");
  const authPage = read("app/page.tsx");
  const profilePage = read("app/(app)/profile/page.tsx");
  const route = read("app/api/username-availability/route.ts");

  const reservedMatch = validation.match(/export const RESERVED_USERNAMES = new Set\(\[(?<body>[\s\S]*?)\]\);/);
  assert.ok(reservedMatch?.groups?.body, "RESERVED_USERNAMES block should be present");
  const reservedUsernames = [...reservedMatch.groups.body.matchAll(/"([^"]+)"/g)].map((match) => match[1]);

  reservedUsernames.forEach((username) => {
    assert.match(username, /^[a-z0-9_]{3,24}$/);
  });

  assert.ok(validation.includes("export const USERNAME_PATTERN = /^[a-z0-9_]{3,24}$/;"));
  assert.match(authActions, /createAdminClient/);
  assert.match(profileActions, /createAdminClient/);
  assert.match(authPage, /UsernameField/);
  assert.match(profilePage, /UsernameField/);
  assert.match(route, /createAdminClient/);
  assert.match(route, /username_taken/);
  assert.match(route, /reserved_username/);
});
