"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";
import { writeAuditLog } from "@/lib/audit";
import { EMAIL_BLAST_EDITABLE_STATUSES, EMAIL_BLAST_HTML_LIMIT, hasMeaningfulEmailBlastContent, parseRecipientSnapshot, resolveAudienceRecipients } from "@/lib/email-blasts";
import { getGmailSmtpReadiness, sendGmailMessage } from "@/lib/email/gmail-smtp";
import { getOrCreateFinanceSettings } from "@/lib/finance-settings";
import { requireAdmin } from "@/lib/admin";
import { postMediaUrls, removePostMediaFiles } from "@/lib/post-media";
import { assertRateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { createUniqueReferralCode } from "@/lib/referrals";
import { createAdminClient, hasSupabaseAdminKey } from "@/lib/supabase/admin";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function textValue(formData: FormData, key: string, fallback = "") {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : fallback;
}

function intValue(formData: FormData, key: string) {
  const value = Number(textValue(formData, key).replace(/,/g, ""));
  return Number.isInteger(value) ? value : 0;
}

function strictIntegerValue(formData: FormData, key: string) {
  const raw = textValue(formData, key);
  return /^\d+$/.test(raw) ? Number(raw) : null;
}

function strictDecimalValue(formData: FormData, key: string) {
  const raw = textValue(formData, key);
  return /^\d+(\.\d{1,4})?$/.test(raw) ? Number(raw) : null;
}

function fileValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return value instanceof File && value.size > 0 ? value : null;
}

function emailValue(formData: FormData, key: string) {
  const value = textValue(formData, key).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : "";
}

function validEmailBlastAudience(value: string): value is "all" | "active" | "suspended" {
  return value === "all" || value === "active" || value === "suspended";
}

function badgeStoragePathFromPublicUrl(imageUrl: string | null | undefined) {
  if (!imageUrl) return null;

  try {
    const url = new URL(imageUrl);
    const marker = "/storage/v1/object/public/badge-images/";
    const markerIndex = url.pathname.indexOf(marker);
    if (markerIndex === -1) return null;
    return decodeURIComponent(url.pathname.slice(markerIndex + marker.length));
  } catch {
    return null;
  }
}

async function getEmailBlastForAdmin(supabase: Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createAdminClient>, blastId: string) {
  const { data: blast, error } = await supabase
    .from("email_blasts")
    .select("id, subject, html_body, audience, status")
    .eq("id", blastId)
    .maybeSingle();

  if (error || !blast) {
    redirect("/admin/email-blasts?error=missing_blast");
  }

  return blast;
}

function selectedIds(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .filter((value): value is string => typeof value === "string" && uuidPattern.test(value));
}

async function insertLedger(profileId: string, credits: number, description: string, source: "adjustment" | "admin_credit") {
  const supabase = await createClient();
  const { error } = await supabase.from("credit_ledger").insert({
    credits,
    description,
    profile_id: profileId,
    source,
  });
  if (error) throw new Error(error.message);
}

async function getRewardRuleForAction(action: string) {
  const supabase = hasSupabaseAdminKey() ? createAdminClient() : await createClient();
  const { data, error } = await supabase
    .from("reward_rules")
    .select("action, enabled, min_credits_per_action, max_credits_per_action")
    .eq("action", action)
    .maybeSingle();

  if (error) throw new Error(error.message);

  return data as {
    action: string;
    enabled: boolean;
    max_credits_per_action: number | null;
    min_credits_per_action: number;
  } | null;
}

function assertRewardRuleAllowsCredits(rule: Awaited<ReturnType<typeof getRewardRuleForAction>>, credits: number, redirectPath: string) {
  if (!rule || !rule.enabled) {
    redirect(`${redirectPath}?error=reward_disabled`);
  }

  if (credits < rule.min_credits_per_action) {
    redirect(`${redirectPath}?error=reward_below_minimum`);
  }

  if (rule.max_credits_per_action !== null && credits > rule.max_credits_per_action) {
    redirect(`${redirectPath}?error=reward_above_maximum`);
  }
}

async function syncAuthRole(profileId: string, role: "admin" | "user") {
  const supabaseAdmin = createAdminClient();
  const { error } = await supabaseAdmin.auth.admin.updateUserById(profileId, {
    app_metadata: { role },
  });
  if (error) throw new Error(error.message);
}

export async function createAdminUserAction(formData: FormData) {
  const admin = await requireAdmin();
  await assertRateLimit(`admin:create-user:${admin.id}`, 10, 60 * 60 * 1000);

  const email = emailValue(formData, "email");
  const password = textValue(formData, "password");
  const displayName = textValue(formData, "displayName").slice(0, 80);
  const role = textValue(formData, "role") === "admin" ? "admin" : "user";
  const statusInput = textValue(formData, "status");
  const status = ["active", "onboarding", "pending_payment", "suspended"].includes(statusInput) ? statusInput : "active";

  if (!email) redirect("/admin/users?error=invalid_email");
  if (password.length < 8) redirect("/admin/users?error=weak_password");
  if (!displayName) redirect("/admin/users?error=missing_name");

  const supabaseAdmin = createAdminClient();
  const { data: authUser, error: authError } = await supabaseAdmin.auth.admin.createUser({
    app_metadata: { role },
    email,
    email_confirm: true,
    password,
    user_metadata: { display_name: displayName },
  });

  if (authError || !authUser.user) {
    redirect(`/admin/users?error=${encodeURIComponent(authError?.message ?? "user_create_failed")}`);
  }

  const supabase = await createClient();
  const referralCode = await createUniqueReferralCode();
  const { error: profileError } = await supabase.from("profiles").upsert({
    display_name: displayName,
    id: authUser.user.id,
    referral_code: referralCode,
    role,
    status,
    updated_at: new Date().toISOString(),
  });

  if (profileError) {
    await supabaseAdmin.auth.admin.deleteUser(authUser.user.id);
    redirect(`/admin/users?error=${encodeURIComponent(profileError.message)}`);
  }

  revalidatePath("/admin/users");
  await writeAuditLog({
    action: "admin.users.created",
    actorId: admin.id,
    actorType: "admin",
    entityId: authUser.user.id,
    entityType: "profile",
    metadata: { email, role, status },
  });
  redirect("/admin/users?updated=user_created");
}

export async function bulkUserAction(formData: FormData) {
  const admin = await requireAdmin();
  await assertRateLimit(`admin:bulk-users:${admin.id}`, 20, 10 * 60 * 1000);
  const action = textValue(formData, "bulkAction");
  const ids = selectedIds(formData, "userIds").filter((id) => id !== admin.id);
  const credits = Math.abs(intValue(formData, "credits"));
  const reason = textValue(formData, "reason", "Admin adjustment").slice(0, 160);
  const allowedActions = new Set(["activate", "credit", "deduct", "delete", "make_admin", "remove", "remove_admin", "suspend"]);

  if (ids.length === 0) redirect("/admin/users?error=no_users");
  if (!allowedActions.has(action)) redirect("/admin/users?error=invalid_action");

  const supabase = await createClient();
  const { data: users, error: usersError } = await supabase
    .from("profiles")
    .select("id, credits_balance")
    .in("id", ids);

  if (usersError) throw new Error(usersError.message);

  if (action === "credit" || action === "deduct") {
    if (credits <= 0) redirect("/admin/users?error=invalid_credits");
    const rule = await getRewardRuleForAction(action === "credit" ? "admin_credit" : "admin_adjustment");
    assertRewardRuleAllowsCredits(rule, credits, "/admin/users");
    const signedCredits = action === "credit" ? credits : -credits;
    await Promise.all(
      (users ?? []).map(async (user) => {
        const { error } = await supabase
          .from("profiles")
          .update({ credits_balance: user.credits_balance + signedCredits, updated_at: new Date().toISOString() })
          .eq("id", user.id);
        if (error) throw new Error(error.message);
        await insertLedger(user.id, signedCredits, reason, action === "credit" ? "admin_credit" : "adjustment");
      }),
    );
  }

  if (action === "remove") {
    const rule = await getRewardRuleForAction("admin_adjustment");
    await Promise.all(
      (users ?? []).map(async (user) => {
        if (Math.abs(user.credits_balance) > 0) {
          assertRewardRuleAllowsCredits(rule, Math.abs(user.credits_balance), "/admin/users");
        }
        const { error } = await supabase
          .from("profiles")
          .update({ credits_balance: 0, updated_at: new Date().toISOString() })
          .eq("id", user.id);
        if (error) throw new Error(error.message);
        if (user.credits_balance !== 0) {
          await insertLedger(user.id, -user.credits_balance, reason || "Admin balance removal", "adjustment");
        }
      }),
    );
  }

  if (action === "suspend") {
    const { error } = await supabase
      .from("profiles")
      .update({ status: "suspended", updated_at: new Date().toISOString() })
      .in("id", ids);
    if (error) throw new Error(error.message);
  }

  if (action === "activate") {
    const { error } = await supabase
      .from("profiles")
      .update({ status: "active", updated_at: new Date().toISOString() })
      .in("id", ids);
    if (error) throw new Error(error.message);
  }

  if (action === "make_admin" || action === "remove_admin") {
    const nextRole = action === "make_admin" ? "admin" : "user";
    const { error } = await supabase
      .from("profiles")
      .update({ role: nextRole, updated_at: new Date().toISOString() })
      .in("id", ids);
    if (error) throw new Error(error.message);
    await Promise.all(ids.map((id) => syncAuthRole(id, nextRole)));
  }

  if (action === "delete") {
    const { error } = await supabase
      .from("profiles")
      .update({
        account_name: null,
        account_number: null,
        bank_name: null,
        credits_balance: 0,
        display_name: "Deleted user",
        status: "suspended",
        updated_at: new Date().toISOString(),
      })
      .in("id", ids);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/admin/users");
  await writeAuditLog({
    action: `admin.users.${action}`,
    actorId: admin.id,
    actorType: "admin",
    entityType: "profiles",
    metadata: { credits, count: ids.length, reason },
  });
  redirect("/admin/users?updated=users");
}

export async function moderatePostAction(formData: FormData) {
  const admin = await requireAdmin();
  await assertRateLimit(`admin:moderation:${admin.id}`, 60, 10 * 60 * 1000);
  const postId = textValue(formData, "postId");
  const action = textValue(formData, "moderationAction");
  const message = textValue(formData, "message", "Your post was rejected by moderation.").slice(0, 240);

  if (!uuidPattern.test(postId)) redirect("/admin/moderation?error=invalid_post");

  const supabase = hasSupabaseAdminKey() ? createAdminClient() : await createClient();
  const { data: post, error: postError } = await supabase.from("posts").select("id, author_id, status, media_url, media_urls, audio_url").eq("id", postId).maybeSingle();
  if (postError || !post) redirect("/admin/moderation?error=missing_post");

  if (action === "publish" || action === "reject") {
    if (post.status !== "pending") redirect("/admin/moderation?error=invalid_transition");
    const { error } = await supabase.from("posts").update({ status: action === "publish" ? "published" : "rejected" }).eq("id", postId);
    if (error) throw new Error(error.message);
  }

  if (action === "reject") {
    await supabase.from("platform_notifications").insert({
      audience: "all",
      body: message,
      created_by: admin.id,
      recipient_profile_id: post.author_id,
      title: "Post rejected",
    });
  }

  if (action === "delete") {
    const childDeletes = await Promise.all([
      supabase.from("post_comments").delete().eq("post_id", postId),
      supabase.from("post_bookmarks").delete().eq("post_id", postId),
      supabase.from("post_likes").delete().eq("post_id", postId),
    ]);
    const childDeleteError = childDeletes.find((result) => result.error)?.error;
    if (childDeleteError) throw new Error(childDeleteError.message);
    const { error } = await supabase.from("posts").delete().eq("id", postId);
    if (error) throw new Error(error.message);
    await removePostMediaFiles(postMediaUrls(post.media_url, post.media_urls, post.audio_url));
  }

  if (action !== "publish" && action !== "reject" && action !== "delete") {
    redirect("/admin/moderation?error=invalid_action");
  }

  revalidatePath("/admin/moderation");
  revalidatePath("/admin");
  revalidatePath("/feed");
  revalidatePath(`/u/${post.author_id}`);
  revalidatePath("/profile");
  await writeAuditLog({
    action: `admin.post.${action}`,
    actorId: admin.id,
    actorType: "admin",
    entityId: postId,
    entityType: "post",
    metadata: { message: action === "reject" ? message : undefined },
  });
  redirect("/admin/moderation?updated=moderation");
}

export async function reviewWithdrawalAction(formData: FormData) {
  const admin = await requireAdmin();
  await assertRateLimit(`admin:withdrawals:${admin.id}`, 40, 10 * 60 * 1000);
  const withdrawalId = textValue(formData, "withdrawalId");
  const action = textValue(formData, "reviewAction");
  const note = textValue(formData, "reviewNote").slice(0, 240);

  if (!uuidPattern.test(withdrawalId)) redirect("/admin/withdrawals?error=invalid_withdrawal");
  const nextStatus = action === "approve" ? "approved" : action === "paid" ? "paid" : action === "reject" ? "rejected" : null;
  if (!nextStatus) redirect("/admin/withdrawals?error=invalid_action");

  const supabase = hasSupabaseAdminKey() ? createAdminClient() : await createClient();
  const { data: request, error: requestError } = await supabase
    .from("withdrawals")
    .select("id, profile_id, status, amount_credits, amount_naira")
    .eq("id", withdrawalId)
    .maybeSingle();
  if (requestError || !request) redirect("/admin/withdrawals?error=missing_withdrawal");

  const canTransition =
    (request.status === "pending" && (nextStatus === "approved" || nextStatus === "rejected")) ||
    (request.status === "approved" && nextStatus === "paid");
  if (!canTransition) redirect("/admin/withdrawals?error=invalid_transition");

  const reviewUpdate = await supabase
    .from("withdrawals")
    .update({
      review_note: note || null,
      reviewed_at: new Date().toISOString(),
      reviewed_by: admin.id,
      status: nextStatus,
    })
    .eq("id", withdrawalId);
  if (reviewUpdate.error) {
    const missingReviewColumns =
      reviewUpdate.error.message.includes("reviewed_at") ||
      reviewUpdate.error.message.includes("review_note") ||
      reviewUpdate.error.message.includes("reviewed_by");

    if (!missingReviewColumns) {
      throw new Error(reviewUpdate.error.message);
    }

    const { error: statusOnlyError } = await supabase.from("withdrawals").update({ status: nextStatus }).eq("id", withdrawalId);
    if (statusOnlyError) throw new Error(statusOnlyError.message);
  }

  await supabase.from("platform_notifications").insert({
    audience: "all",
    body:
      nextStatus === "approved"
        ? `Your withdrawal request for NGN ${request.amount_naira} was approved.`
        : nextStatus === "paid"
          ? `Your withdrawal request for NGN ${request.amount_naira} was marked as paid.`
          : `Your withdrawal request for NGN ${request.amount_naira} was rejected.${note ? ` ${note}` : ""}`,
    created_by: admin.id,
    recipient_profile_id: request.profile_id,
    title: `Withdrawal ${nextStatus}`,
  });

  if (nextStatus === "paid") {
    const { data: profile, error: profileReadError } = await supabase
      .from("profiles")
      .select("credits_balance")
      .eq("id", request.profile_id)
      .maybeSingle();
    if (profileReadError) throw new Error(profileReadError.message);
    const { error: profileUpdateError } = await supabase
      .from("profiles")
      .update({ credits_balance: Math.max(0, (profile?.credits_balance ?? 0) - request.amount_credits), updated_at: new Date().toISOString() })
      .eq("id", request.profile_id);
    if (profileUpdateError) throw new Error(profileUpdateError.message);
    await insertLedger(request.profile_id, -Math.abs(request.amount_credits), `Withdrawal paid: NGN ${request.amount_naira}`, "adjustment");
  }

  revalidatePath("/admin/withdrawals");
  revalidatePath("/admin");
  await writeAuditLog({
    action: `admin.withdrawal.${nextStatus}`,
    actorId: admin.id,
    actorType: "admin",
    entityId: withdrawalId,
    entityType: "withdrawal",
    metadata: { previousStatus: request.status, reviewNote: note },
  });
  redirect("/admin/withdrawals?updated=withdrawal");
}

export async function updateLeaderboardSettingsAction(formData: FormData) {
  const admin = await requireAdmin();
  await assertRateLimit(`admin:leaderboard:${admin.id}`, 20, 10 * 60 * 1000);
  const settingsId = textValue(formData, "settingsId");
  const values = {
    leaderboard_strict_mode: formData.get("leaderboardStrictMode") === "on",
    leaderboard_uses_bookmarks: formData.get("leaderboardUsesBookmarks") === "on",
    leaderboard_uses_engagement: formData.get("leaderboardUsesEngagement") === "on",
    leaderboard_uses_referrals: formData.get("leaderboardUsesReferrals") === "on",
    leaderboard_uses_watch_time: formData.get("leaderboardUsesWatchTime") === "on",
    updated_at: new Date().toISOString(),
  };
  const supabase = hasSupabaseAdminKey() ? createAdminClient() : await createClient();
  const result = uuidPattern.test(settingsId)
    ? await supabase.from("platform_settings").update(values).eq("id", settingsId)
    : await supabase.from("platform_settings").insert(values);
  if (result.error) throw new Error(result.error.message);
  revalidateTag("platform-settings", "max");
  revalidatePath("/admin/leaderboard");
  await writeAuditLog({ action: "admin.leaderboard.updated", actorId: admin.id, actorType: "admin", entityId: uuidPattern.test(settingsId) ? settingsId : null, entityType: "platform_settings", metadata: values });
  redirect("/admin/leaderboard?updated=leaderboard");
}

export async function updatePlatformSettingsAction(formData: FormData) {
  const admin = await requireAdmin();
  await assertRateLimit(`admin:platform:${admin.id}`, 20, 10 * 60 * 1000);
  const settingsId = textValue(formData, "settingsId");
  const values = {
    daily_watch_limit_seconds: Math.max(60, intValue(formData, "dailyWatchLimitSeconds")),
    max_upload_size_mb: Math.min(100, Math.max(1, intValue(formData, "maxUploadSizeMb"))),
    post_approval_required: formData.get("postApprovalRequired") === "on",
    sponsored_tasks_enabled: formData.get("sponsoredTasksEnabled") === "on",
    sponsored_withdrawals_unlocked: formData.get("sponsoredWithdrawalsUnlocked") === "on",
    under_construction: formData.get("underConstruction") === "on",
    updated_at: new Date().toISOString(),
  };
  const supabase = hasSupabaseAdminKey() ? createAdminClient() : await createClient();
  const result = uuidPattern.test(settingsId)
    ? await supabase.from("platform_settings").update(values).eq("id", settingsId)
    : await supabase.from("platform_settings").insert(values);
  if (result.error) throw new Error(result.error.message);
  revalidateTag("platform-settings", "max");
  revalidatePath("/admin/platform");
  await writeAuditLog({ action: "admin.platform.updated", actorId: admin.id, actorType: "admin", entityId: uuidPattern.test(settingsId) ? settingsId : null, entityType: "platform_settings", metadata: values });
  redirect("/admin/platform?updated=platform");
}

export async function updateRewardRuleAction(formData: FormData) {
  const admin = await requireAdmin();
  await assertRateLimit(`admin:reward-rule:${admin.id}`, 30, 10 * 60 * 1000);
  const ruleId = textValue(formData, "ruleId");
  const credits = strictIntegerValue(formData, "credits");
  const minCreditsPerAction = strictIntegerValue(formData, "minCreditsPerAction");
  const hasNoMaximum = formData.get("maxCreditsUnlimited") === "on";
  const maxCreditsPerAction = hasNoMaximum ? null : strictIntegerValue(formData, "maxCreditsPerAction");
  const enabled = formData.get("enabled") === "on";

  if (
    !uuidPattern.test(ruleId) ||
    credits === null ||
    minCreditsPerAction === null ||
    (!hasNoMaximum && maxCreditsPerAction === null) ||
    (maxCreditsPerAction !== null && maxCreditsPerAction < minCreditsPerAction)
  ) {
    redirect("/admin/rewards?error=invalid_reward");
  }

  const supabase = hasSupabaseAdminKey() ? createAdminClient() : await createClient();
  const { data: rule, error: readError } = await supabase
    .from("reward_rules")
    .select("id, action")
    .eq("id", ruleId)
    .maybeSingle();

  if (readError || !rule) {
    redirect("/admin/rewards?error=missing_reward");
  }

  const { error } = await supabase
    .from("reward_rules")
    .update({
      credits,
      enabled,
      max_credits_per_action: maxCreditsPerAction,
      min_credits_per_action: minCreditsPerAction,
      updated_at: new Date().toISOString(),
      updated_by: admin.id,
    })
    .eq("id", ruleId);

  if (error) throw new Error(error.message);

  revalidatePath("/admin/rewards");
  await writeAuditLog({
    action: "admin.reward_rule.updated",
    actorId: admin.id,
    actorType: "admin",
    entityId: ruleId,
    entityType: "reward_rule",
    metadata: { action: rule.action, credits, enabled, maxCreditsPerAction, minCreditsPerAction },
  });
  redirect("/admin/rewards?updated=reward_rule");
}

export async function updateFinanceSettingsAction(formData: FormData) {
  const admin = await requireAdmin();
  await assertRateLimit(`admin:finance-settings:${admin.id}`, 20, 10 * 60 * 1000);
  const creditsPerUnit = strictIntegerValue(formData, "creditsPerUnit");
  const usdPerUnit = strictDecimalValue(formData, "usdPerUnit");
  const ngnPerUsd = strictDecimalValue(formData, "ngnPerUsd");

  if (creditsPerUnit === null || usdPerUnit === null || ngnPerUsd === null || creditsPerUnit <= 0 || usdPerUnit <= 0 || ngnPerUsd <= 0) {
    redirect("/admin/rewards?error=invalid_finance_settings");
  }

  const current = await getOrCreateFinanceSettings();
  const supabase = hasSupabaseAdminKey() ? createAdminClient() : await createClient();
  const values = {
    active: true,
    credits_per_unit: creditsPerUnit,
    ngn_per_usd: ngnPerUsd.toFixed(4),
    updated_at: new Date().toISOString(),
    updated_by: admin.id,
    usd_per_unit: usdPerUnit.toFixed(4),
  };
  const result = current.id
    ? await supabase.from("finance_settings").update(values).eq("id", current.id)
    : await supabase.from("finance_settings").insert(values);

  if (result.error) throw new Error(result.error.message);

  revalidateTag("finance-settings", "max");
  revalidatePath("/admin/rewards");
  revalidatePath("/wallet");
  await writeAuditLog({
    action: "admin.finance_settings.updated",
    actorId: admin.id,
    actorType: "admin",
    entityId: current.id,
    entityType: "finance_settings",
    metadata: { creditsPerUnit, ngnPerUsd, usdPerUnit },
  });
  redirect("/admin/rewards?updated=finance_settings");
}

export async function createNotificationAction(formData: FormData) {
  const admin = await requireAdmin();
  await assertRateLimit(`admin:notifications:${admin.id}`, 30, 60 * 60 * 1000);
  const deliveryMode = textValue(formData, "deliveryMode", "audience");
  const title = textValue(formData, "title").slice(0, 80);
  const body = textValue(formData, "body").slice(0, 600);
  const audience = textValue(formData, "audience") as "all" | "active" | "suspended";
  const supabase = hasSupabaseAdminKey() ? createAdminClient() : await createClient();
  let recipientProfileId: string | null = null;

  if (deliveryMode === "targeted") {
    const candidateRecipientId = textValue(formData, "recipientProfileId");
    if (!uuidPattern.test(candidateRecipientId) || !title || !body) redirect("/admin/platform?error=invalid_notification");
    const { data: recipient, error: recipientError } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", candidateRecipientId)
      .maybeSingle();

    if (recipientError || !recipient) redirect("/admin/platform?error=invalid_notification");
    recipientProfileId = recipient.id;
  } else if (!title || !body || !["all", "active", "suspended"].includes(audience)) {
    redirect("/admin/platform?error=invalid_notification");
  }

  const { data, error } = await supabase
    .from("platform_notifications")
    .insert({ audience: recipientProfileId ? "all" : audience, body, created_by: admin.id, recipient_profile_id: recipientProfileId, title })
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  revalidatePath("/admin/platform");
  await writeAuditLog({
    action: "admin.notification.created",
    actorId: admin.id,
    actorType: "admin",
    entityId: data?.id,
    entityType: "platform_notification",
    metadata: { audience: recipientProfileId ? "targeted" : audience, recipientProfileId, title },
  });
  redirect("/admin/platform?updated=notification");
}

export async function archiveNotificationAction(formData: FormData) {
  const admin = await requireAdmin();
  await assertRateLimit(`admin:notification-archive:${admin.id}`, 30, 60 * 60 * 1000);
  const notificationId = textValue(formData, "notificationId");
  if (!uuidPattern.test(notificationId)) redirect("/admin/platform?error=invalid_notification");

  const supabase = hasSupabaseAdminKey() ? createAdminClient() : await createClient();
  const { error } = await supabase
    .from("platform_notifications")
    .update({ archived_at: new Date().toISOString() })
    .eq("id", notificationId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/platform");
  revalidatePath("/feed");
  await writeAuditLog({ action: "admin.notification.archived", actorId: admin.id, actorType: "admin", entityId: notificationId, entityType: "platform_notification" });
  redirect("/admin/platform?updated=notification_archived");
}

export async function deleteNotificationAction(formData: FormData) {
  const admin = await requireAdmin();
  await assertRateLimit(`admin:notification-delete:${admin.id}`, 20, 60 * 60 * 1000);
  const notificationId = textValue(formData, "notificationId");
  if (!uuidPattern.test(notificationId)) redirect("/admin/platform?error=invalid_notification");

  const supabase = hasSupabaseAdminKey() ? createAdminClient() : await createClient();
  const { error } = await supabase.from("platform_notifications").delete().eq("id", notificationId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/platform");
  revalidatePath("/feed");
  await writeAuditLog({ action: "admin.notification.deleted", actorId: admin.id, actorType: "admin", entityId: notificationId, entityType: "platform_notification" });
  redirect("/admin/platform?updated=notification_deleted");
}

export async function createEmailBlastAction(formData: FormData) {
  const admin = await requireAdmin();
  await assertRateLimit(`admin:email-blasts:${admin.id}`, 10, 60 * 60 * 1000);
  const subject = textValue(formData, "subject").slice(0, 120);
  const htmlBody = textValue(formData, "htmlBody").slice(0, EMAIL_BLAST_HTML_LIMIT);
  const audience = textValue(formData, "audience") as "all" | "active" | "suspended";
  if (!subject || !hasMeaningfulEmailBlastContent(htmlBody) || !validEmailBlastAudience(audience)) redirect("/admin/platform?error=invalid_email");
  const supabase = hasSupabaseAdminKey() ? createAdminClient() : await createClient();
  const { data, error } = await supabase.from("email_blasts").insert({ audience, created_by: admin.id, html_body: htmlBody, status: "draft", subject }).select("id").maybeSingle();
  if (error) throw new Error(error.message);
  revalidatePath("/admin/platform");
  revalidatePath("/admin/email-blasts");
  await writeAuditLog({ action: "admin.email_blast.created", actorId: admin.id, actorType: "admin", entityId: data?.id, entityType: "email_blast", metadata: { audience, subject } });
  redirect("/admin/platform?updated=email_blast");
}

export async function updateEmailBlastAction(formData: FormData) {
  const admin = await requireAdmin();
  await assertRateLimit(`admin:email-blast-update:${admin.id}`, 20, 60 * 60 * 1000);
  const blastId = textValue(formData, "blastId");
  const subject = textValue(formData, "subject").slice(0, 120);
  const htmlBody = textValue(formData, "htmlBody").slice(0, EMAIL_BLAST_HTML_LIMIT);
  const audience = textValue(formData, "audience") as "all" | "active" | "suspended";
  if (!uuidPattern.test(blastId)) redirect("/admin/email-blasts?error=invalid_blast");
  if (!subject || !hasMeaningfulEmailBlastContent(htmlBody) || !validEmailBlastAudience(audience)) redirect("/admin/email-blasts?error=invalid_email");

  const supabase = hasSupabaseAdminKey() ? createAdminClient() : await createClient();
  const { data: blast, error: blastError } = await supabase.from("email_blasts").select("status").eq("id", blastId).maybeSingle();
  if (blastError || !blast) redirect("/admin/email-blasts?error=missing_blast");
  if (!EMAIL_BLAST_EDITABLE_STATUSES.has(blast.status)) redirect("/admin/email-blasts?error=invalid_transition");

  const { error } = await supabase
    .from("email_blasts")
    .update({
      audience,
      error_message: null,
      failed_at: null,
      failed_recipient_count: 0,
      failed_recipient_snapshot: "[]",
      html_body: htmlBody,
      last_processed_at: null,
      processing_started_at: null,
      recipient_count: 0,
      recipient_snapshot: null,
      send_cursor: 0,
      sent_at: null,
      status: "draft",
      subject,
    })
    .eq("id", blastId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/email-blasts");
  await writeAuditLog({ action: "admin.email_blast.updated", actorId: admin.id, actorType: "admin", entityId: blastId, entityType: "email_blast", metadata: { audience, subject } });
  redirect("/admin/email-blasts?updated=email_blast_updated");
}

export async function deleteEmailBlastAction(formData: FormData) {
  const admin = await requireAdmin();
  await assertRateLimit(`admin:email-blast-delete:${admin.id}`, 20, 60 * 60 * 1000);
  const blastId = textValue(formData, "blastId");
  if (!uuidPattern.test(blastId)) redirect("/admin/email-blasts?error=invalid_blast");

  const supabase = hasSupabaseAdminKey() ? createAdminClient() : await createClient();
  const { data: blast, error: blastError } = await supabase.from("email_blasts").select("status").eq("id", blastId).maybeSingle();
  if (blastError || !blast) redirect("/admin/email-blasts?error=missing_blast");
  if (!EMAIL_BLAST_EDITABLE_STATUSES.has(blast.status)) redirect("/admin/email-blasts?error=invalid_transition");

  const { error } = await supabase.from("email_blasts").delete().eq("id", blastId);
  if (error) throw new Error(error.message);

  revalidatePath("/admin/email-blasts");
  await writeAuditLog({ action: "admin.email_blast.deleted", actorId: admin.id, actorType: "admin", entityId: blastId, entityType: "email_blast" });
  redirect("/admin/email-blasts?updated=email_blast_deleted");
}

export async function duplicateEmailBlastAction(formData: FormData) {
  const admin = await requireAdmin();
  await assertRateLimit(`admin:email-blast-duplicate:${admin.id}`, 20, 60 * 60 * 1000);
  const blastId = textValue(formData, "blastId");
  if (!uuidPattern.test(blastId)) redirect("/admin/email-blasts?error=invalid_blast");

  const supabase = hasSupabaseAdminKey() ? createAdminClient() : await createClient();
  const { data: blast, error: blastError } = await supabase
    .from("email_blasts")
    .select("subject, html_body, audience")
    .eq("id", blastId)
    .maybeSingle();
  if (blastError || !blast) redirect("/admin/email-blasts?error=missing_blast");

  const { data, error } = await supabase
    .from("email_blasts")
    .insert({
      audience: blast.audience,
      created_by: admin.id,
      failed_recipient_count: 0,
      failed_recipient_snapshot: "[]",
      html_body: blast.html_body,
      recipient_count: 0,
      recipient_snapshot: null,
      send_cursor: 0,
      status: "draft",
      subject: `Copy of ${blast.subject}`.slice(0, 120),
    })
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);

  revalidatePath("/admin/email-blasts");
  await writeAuditLog({ action: "admin.email_blast.duplicated", actorId: admin.id, actorType: "admin", entityId: data?.id, entityType: "email_blast", metadata: { sourceBlastId: blastId } });
  redirect("/admin/email-blasts?updated=email_blast_duplicated");
}

export async function sendEmailBlastAction(formData: FormData) {
  const admin = await requireAdmin();
  await assertRateLimit(`admin:email-blast-send:${admin.id}`, 5, 60 * 60 * 1000);
  const blastId = textValue(formData, "blastId");
  if (!uuidPattern.test(blastId)) redirect("/admin/email-blasts?error=invalid_blast");
  if (!hasSupabaseAdminKey()) redirect("/admin/email-blasts?error=missing_service_role");
  if (!getGmailSmtpReadiness().ready) redirect("/admin/email-blasts?error=missing_smtp");

  const supabase = createAdminClient();
  const { data: blast, error: blastError } = await supabase
    .from("email_blasts")
    .select("id, subject, html_body, audience, status, failed_recipient_snapshot, recipient_count")
    .eq("id", blastId)
    .maybeSingle();
  if (blastError || !blast) redirect("/admin/email-blasts?error=missing_blast");
  if (blast.status === "sending" || blast.status === "queued") redirect("/admin/email-blasts?error=already_sending");
  if (blast.status === "sent") redirect("/admin/email-blasts?error=invalid_transition");
  if (!validEmailBlastAudience(blast.audience)) redirect("/admin/email-blasts?error=invalid_email");

  const retryRecipients = blast.status === "failed" ? parseRecipientSnapshot(blast.failed_recipient_snapshot as string | null) : [];
  const recipients = retryRecipients.length > 0 ? retryRecipients : await resolveAudienceRecipients(supabase, blast.audience);

  if (recipients.length === 0) {
    redirect("/admin/email-blasts?error=no_recipients");
  }

  const { error: updateError } = await supabase
    .from("email_blasts")
    .update({
      error_message: null,
      failed_at: null,
      failed_recipient_count: 0,
      failed_recipient_snapshot: "[]",
      last_processed_at: null,
      processing_started_at: new Date().toISOString(),
      recipient_snapshot: JSON.stringify(recipients),
      send_cursor: 0,
      sent_at: null,
      status: "queued",
    })
    .eq("id", blastId);

  if (updateError) throw new Error(updateError.message);

  await writeAuditLog({
    action: "admin.email_blast.queued",
    actorId: admin.id,
    actorType: "admin",
    entityId: blastId,
    entityType: "email_blast",
    metadata: {
      audience: blast.audience,
      recipientCount: recipients.length,
      retryingFailedRecipients: retryRecipients.length > 0,
    },
  });

  revalidatePath("/admin/email-blasts");
  redirect("/admin/email-blasts?updated=email_blast_queued");
}

export async function sendPreviewEmailBlastAction(formData: FormData) {
  const admin = await requireAdmin();
  await assertRateLimit(`admin:email-blast-preview:${admin.id}`, 15, 60 * 60 * 1000);
  const blastId = textValue(formData, "blastId");
  if (!uuidPattern.test(blastId)) redirect("/admin/email-blasts?error=invalid_blast");
  if (!getGmailSmtpReadiness().ready) redirect("/admin/email-blasts?error=missing_smtp");
  if (!admin.email) redirect("/admin/email-blasts?error=missing_admin_email");

  const supabase = hasSupabaseAdminKey() ? createAdminClient() : await createClient();
  const blast = await getEmailBlastForAdmin(supabase, blastId);

  await sendGmailMessage({
    html: blast.html_body,
    subject: `[Preview] ${blast.subject}`.slice(0, 140),
    to: admin.email,
  });

  await writeAuditLog({
    action: "admin.email_blast.preview_sent",
    actorId: admin.id,
    actorType: "admin",
    entityId: blastId,
    entityType: "email_blast",
    metadata: { recipientEmail: admin.email },
  });

  redirect("/admin/email-blasts?updated=email_preview_sent");
}

export async function sendTestEmailBlastAction(formData: FormData) {
  const admin = await requireAdmin();
  await assertRateLimit(`admin:email-blast-test:${admin.id}`, 20, 60 * 60 * 1000);
  const blastId = textValue(formData, "blastId");
  const recipientEmail = emailValue(formData, "recipientEmail");
  if (!uuidPattern.test(blastId)) redirect("/admin/email-blasts?error=invalid_blast");
  if (!recipientEmail) redirect("/admin/email-blasts?error=invalid_email");
  if (!getGmailSmtpReadiness().ready) redirect("/admin/email-blasts?error=missing_smtp");

  const supabase = hasSupabaseAdminKey() ? createAdminClient() : await createClient();
  const blast = await getEmailBlastForAdmin(supabase, blastId);

  await sendGmailMessage({
    html: blast.html_body,
    subject: `[Test] ${blast.subject}`.slice(0, 140),
    to: recipientEmail,
  });

  await writeAuditLog({
    action: "admin.email_blast.test_sent",
    actorId: admin.id,
    actorType: "admin",
    entityId: blastId,
    entityType: "email_blast",
    metadata: { recipientEmail },
  });

  redirect("/admin/email-blasts?updated=email_test_sent");
}

export async function createBadgeAction(formData: FormData) {
  const admin = await requireAdmin();
  await assertRateLimit(`admin:badges:${admin.id}`, 30, 60 * 60 * 1000);
  const name = textValue(formData, "name").slice(0, 48);
  const color = textValue(formData, "color", "#5fd7ff").slice(0, 24);
  const description = textValue(formData, "description").slice(0, 180);
  const imageFile = fileValue(formData, "imageFile");
  const allowedImageTypes = new Set(["image/gif", "image/jpeg", "image/png", "image/svg+xml", "image/webp"]);
  if (!name || !description || !imageFile || !allowedImageTypes.has(imageFile.type) || imageFile.size > 5 * 1024 * 1024) {
    redirect("/admin/badges?error=invalid_badge");
  }

  const supabase = hasSupabaseAdminKey() ? createAdminClient() : await createClient();
  const extension = imageFile.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
  const imagePath = `${admin.id}/${crypto.randomUUID()}.${extension}`;
  const upload = await supabase.storage.from("badge-images").upload(imagePath, imageFile, {
    cacheControl: "31536000",
    contentType: imageFile.type,
    upsert: false,
  });

  if (upload.error) {
    redirect(`/admin/badges?error=${encodeURIComponent(upload.error.message)}`);
  }

  const { data: publicImage } = supabase.storage.from("badge-images").getPublicUrl(imagePath);
  const { data, error } = await supabase
    .from("badges")
    .insert({ color, created_by: admin.id, description, image_url: publicImage.publicUrl, name })
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  revalidatePath("/admin/badges");
  revalidatePath("/admin");
  await writeAuditLog({ action: "admin.badge.created", actorId: admin.id, actorType: "admin", entityId: data?.id, entityType: "badge", metadata: { color, hasImage: true, name } });
  redirect("/admin/badges?updated=badge");
}

export async function updateBadgeAction(formData: FormData) {
  const admin = await requireAdmin();
  await assertRateLimit(`admin:badge-update:${admin.id}`, 30, 60 * 60 * 1000);
  const badgeId = textValue(formData, "badgeId");
  const name = textValue(formData, "name").slice(0, 48);
  const color = textValue(formData, "color", "#5fd7ff").slice(0, 24);
  const description = textValue(formData, "description").slice(0, 180);
  const imageFile = fileValue(formData, "imageFile");
  const allowedImageTypes = new Set(["image/gif", "image/jpeg", "image/png", "image/svg+xml", "image/webp"]);

  if (!uuidPattern.test(badgeId) || !name || !description || (imageFile && (!allowedImageTypes.has(imageFile.type) || imageFile.size > 5 * 1024 * 1024))) {
    redirect("/admin/badges?error=invalid_badge");
  }

  const supabase = hasSupabaseAdminKey() ? createAdminClient() : await createClient();
  const { data: existing, error: existingError } = await supabase.from("badges").select("image_url").eq("id", badgeId).maybeSingle();
  if (existingError || !existing) redirect("/admin/badges?error=invalid_badge");

  let imageUrl = existing.image_url as string | null;
  let existingImagePathToRemove: string | null = null;
  if (imageFile) {
    const extension = imageFile.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
    const imagePath = `${admin.id}/${crypto.randomUUID()}.${extension}`;
    const upload = await supabase.storage.from("badge-images").upload(imagePath, imageFile, {
      cacheControl: "31536000",
      contentType: imageFile.type,
      upsert: false,
    });

    if (upload.error) {
      redirect(`/admin/badges?error=${encodeURIComponent(upload.error.message)}`);
    }

    const { data: publicImage } = supabase.storage.from("badge-images").getPublicUrl(imagePath);
    imageUrl = publicImage.publicUrl;
    existingImagePathToRemove = badgeStoragePathFromPublicUrl(existing.image_url as string | null);
  }

  const { error } = await supabase
    .from("badges")
    .update({ color, description, image_url: imageUrl, name })
    .eq("id", badgeId);
  if (error) throw new Error(error.message);

  if (existingImagePathToRemove) {
    await supabase.storage.from("badge-images").remove([existingImagePathToRemove]);
  }

  revalidatePath("/admin/badges");
  revalidatePath("/admin/users");
  revalidatePath("/feed");
  revalidatePath("/profile");
  await writeAuditLog({
    action: "admin.badge.updated",
    actorId: admin.id,
    actorType: "admin",
    entityId: badgeId,
    entityType: "badge",
    metadata: { color, hasReplacementImage: Boolean(imageFile), name },
  });
  redirect("/admin/badges?updated=badge_updated");
}

export async function deleteBadgeAction(formData: FormData) {
  const admin = await requireAdmin();
  await assertRateLimit(`admin:badge-delete:${admin.id}`, 20, 60 * 60 * 1000);
  const badgeId = textValue(formData, "badgeId");
  if (!uuidPattern.test(badgeId)) redirect("/admin/badges?error=invalid_badge");

  const supabase = hasSupabaseAdminKey() ? createAdminClient() : await createClient();
  const { data: badge, error: badgeError } = await supabase
    .from("badges")
    .select("id, name, image_url")
    .eq("id", badgeId)
    .maybeSingle();
  if (badgeError || !badge) redirect("/admin/badges?error=invalid_badge");

  const { count, error: usageError } = await supabase
    .from("profile_badges")
    .select("badge_id", { count: "exact", head: true })
    .eq("badge_id", badgeId);
  if (usageError) throw new Error(usageError.message);
  if ((count ?? 0) > 0) redirect("/admin/badges?error=badge_in_use");

  const { error } = await supabase.from("badges").delete().eq("id", badgeId);
  if (error) throw new Error(error.message);

  const imagePath = badgeStoragePathFromPublicUrl(badge.image_url as string | null);
  if (imagePath) {
    await supabase.storage.from("badge-images").remove([imagePath]);
  }

  revalidatePath("/admin/badges");
  revalidatePath("/admin/users");
  revalidatePath("/feed");
  revalidatePath("/profile");
  await writeAuditLog({
    action: "admin.badge.deleted",
    actorId: admin.id,
    actorType: "admin",
    entityId: badgeId,
    entityType: "badge",
    metadata: { name: badge.name },
  });
  redirect("/admin/badges?updated=badge_deleted");
}

export async function assignProfileBadgeAction(formData: FormData) {
  const admin = await requireAdmin();
  await assertRateLimit(`admin:badge-assign:${admin.id}`, 40, 60 * 60 * 1000);
  const profileId = textValue(formData, "profileId");
  const badgeId = textValue(formData, "badgeId");

  if (!uuidPattern.test(profileId) || !uuidPattern.test(badgeId)) {
    redirect("/admin/users?error=invalid_profile_badge");
  }

  const supabase = hasSupabaseAdminKey() ? createAdminClient() : await createClient();
  const { error } = await supabase
    .from("profile_badges")
    .upsert({ assigned_by: admin.id, badge_id: badgeId, profile_id: profileId }, { onConflict: "profile_id,badge_id" });

  if (error) {
    redirect(`/admin/users?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/users");
  revalidatePath("/feed");
  revalidatePath("/profile");
  revalidatePath(`/u/${profileId}`);
  await writeAuditLog({
    action: "admin.badge.assigned",
    actorId: admin.id,
    actorType: "admin",
    entityId: profileId,
    entityType: "profile",
    metadata: { badgeId },
  });
  redirect("/admin/users?updated=badge_assigned");
}

export async function removeProfileBadgeAction(formData: FormData) {
  const admin = await requireAdmin();
  await assertRateLimit(`admin:badge-remove:${admin.id}`, 40, 60 * 60 * 1000);
  const profileId = textValue(formData, "profileId");
  const badgeId = textValue(formData, "badgeId");

  if (!uuidPattern.test(profileId) || !uuidPattern.test(badgeId)) {
    redirect("/admin/users?error=invalid_profile_badge");
  }

  const supabase = hasSupabaseAdminKey() ? createAdminClient() : await createClient();
  const { error } = await supabase
    .from("profile_badges")
    .delete()
    .eq("profile_id", profileId)
    .eq("badge_id", badgeId);

  if (error) {
    redirect(`/admin/users?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/admin/users");
  revalidatePath("/feed");
  revalidatePath("/profile");
  revalidatePath(`/u/${profileId}`);
  await writeAuditLog({
    action: "admin.badge.removed",
    actorId: admin.id,
    actorType: "admin",
    entityId: profileId,
    entityType: "profile",
    metadata: { badgeId },
  });
  redirect("/admin/users?updated=badge_removed");
}
