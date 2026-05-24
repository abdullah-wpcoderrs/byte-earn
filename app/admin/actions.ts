"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { writeAuditLog } from "@/lib/audit";
import { requireAdmin } from "@/lib/admin";
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

function fileValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return value instanceof File && value.size > 0 ? value : null;
}

function emailValue(formData: FormData, key: string) {
  const value = textValue(formData, key).toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value) ? value : "";
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

async function syncAuthRole(profileId: string, role: "admin" | "user") {
  const supabaseAdmin = createAdminClient();
  const { error } = await supabaseAdmin.auth.admin.updateUserById(profileId, {
    app_metadata: { role },
  });
  if (error) throw new Error(error.message);
}

export async function createAdminUserAction(formData: FormData) {
  const admin = await requireAdmin();
  assertRateLimit(`admin:create-user:${admin.id}`, 10, 60 * 60 * 1000);

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
  assertRateLimit(`admin:bulk-users:${admin.id}`, 20, 10 * 60 * 1000);
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
    await Promise.all(
      (users ?? []).map(async (user) => {
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
  assertRateLimit(`admin:moderation:${admin.id}`, 60, 10 * 60 * 1000);
  const postId = textValue(formData, "postId");
  const action = textValue(formData, "moderationAction");
  const message = textValue(formData, "message", "Your post was rejected by moderation.").slice(0, 240);

  if (!uuidPattern.test(postId)) redirect("/admin/moderation?error=invalid_post");

  const supabase = await createClient();
  const { data: post, error: postError } = await supabase.from("posts").select("id, author_id").eq("id", postId).maybeSingle();
  if (postError || !post) redirect("/admin/moderation?error=missing_post");

  if (action === "publish" || action === "reject") {
    const { error } = await supabase.from("posts").update({ status: action === "publish" ? "published" : "rejected" }).eq("id", postId);
    if (error) throw new Error(error.message);
  }

  if (action === "reject") {
    await supabase.from("platform_notifications").insert({
      audience: "all",
      body: message,
      created_by: admin.id,
      title: "Post rejected",
    });
  }

  if (action === "delete") {
    const { error } = await supabase.from("posts").delete().eq("id", postId);
    if (error) throw new Error(error.message);
  }

  revalidatePath("/admin/moderation");
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
  assertRateLimit(`admin:withdrawals:${admin.id}`, 40, 10 * 60 * 1000);
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
  assertRateLimit(`admin:leaderboard:${admin.id}`, 20, 10 * 60 * 1000);
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
  revalidatePath("/admin/leaderboard");
  await writeAuditLog({ action: "admin.leaderboard.updated", actorId: admin.id, actorType: "admin", entityId: uuidPattern.test(settingsId) ? settingsId : null, entityType: "platform_settings", metadata: values });
  redirect("/admin/leaderboard?updated=leaderboard");
}

export async function updatePlatformSettingsAction(formData: FormData) {
  const admin = await requireAdmin();
  assertRateLimit(`admin:platform:${admin.id}`, 20, 10 * 60 * 1000);
  const settingsId = textValue(formData, "settingsId");
  const values = {
    daily_watch_limit_seconds: Math.max(60, intValue(formData, "dailyWatchLimitSeconds")),
    post_approval_required: formData.get("postApprovalRequired") === "on",
    sponsored_withdrawals_unlocked: formData.get("sponsoredWithdrawalsUnlocked") === "on",
    under_construction: formData.get("underConstruction") === "on",
    updated_at: new Date().toISOString(),
  };
  const supabase = hasSupabaseAdminKey() ? createAdminClient() : await createClient();
  const result = uuidPattern.test(settingsId)
    ? await supabase.from("platform_settings").update(values).eq("id", settingsId)
    : await supabase.from("platform_settings").insert(values);
  if (result.error) throw new Error(result.error.message);
  revalidatePath("/admin/platform");
  await writeAuditLog({ action: "admin.platform.updated", actorId: admin.id, actorType: "admin", entityId: uuidPattern.test(settingsId) ? settingsId : null, entityType: "platform_settings", metadata: values });
  redirect("/admin/platform?updated=platform");
}

export async function createNotificationAction(formData: FormData) {
  const admin = await requireAdmin();
  assertRateLimit(`admin:notifications:${admin.id}`, 30, 60 * 60 * 1000);
  const title = textValue(formData, "title").slice(0, 80);
  const body = textValue(formData, "body").slice(0, 600);
  const audience = textValue(formData, "audience") as "all" | "active" | "suspended";
  if (!title || !body || !["all", "active", "suspended"].includes(audience)) redirect("/admin/platform?error=invalid_notification");
  const supabase = hasSupabaseAdminKey() ? createAdminClient() : await createClient();
  const { data, error } = await supabase.from("platform_notifications").insert({ audience, body, created_by: admin.id, title }).select("id").maybeSingle();
  if (error) throw new Error(error.message);
  revalidatePath("/admin/platform");
  await writeAuditLog({ action: "admin.notification.created", actorId: admin.id, actorType: "admin", entityId: data?.id, entityType: "platform_notification", metadata: { audience, title } });
  redirect("/admin/platform?updated=notification");
}

export async function createEmailBlastAction(formData: FormData) {
  const admin = await requireAdmin();
  assertRateLimit(`admin:email-blasts:${admin.id}`, 10, 60 * 60 * 1000);
  const subject = textValue(formData, "subject").slice(0, 120);
  const htmlBody = textValue(formData, "htmlBody").slice(0, 5000);
  const audience = textValue(formData, "audience") as "all" | "active" | "suspended";
  if (!subject || !htmlBody || !["all", "active", "suspended"].includes(audience)) redirect("/admin/platform?error=invalid_email");
  const supabase = hasSupabaseAdminKey() ? createAdminClient() : await createClient();
  const { data, error } = await supabase.from("email_blasts").insert({ audience, created_by: admin.id, html_body: htmlBody, subject }).select("id").maybeSingle();
  if (error) throw new Error(error.message);
  revalidatePath("/admin/platform");
  await writeAuditLog({ action: "admin.email_blast.created", actorId: admin.id, actorType: "admin", entityId: data?.id, entityType: "email_blast", metadata: { audience, subject } });
  redirect("/admin/platform?updated=email_blast");
}

export async function createBadgeAction(formData: FormData) {
  const admin = await requireAdmin();
  assertRateLimit(`admin:badges:${admin.id}`, 30, 60 * 60 * 1000);
  const name = textValue(formData, "name").slice(0, 48);
  const color = textValue(formData, "color", "#5fd7ff").slice(0, 24);
  const description = textValue(formData, "description").slice(0, 180);
  const imageFile = fileValue(formData, "imageFile");
  const allowedImageTypes = new Set(["image/gif", "image/jpeg", "image/png", "image/svg+xml", "image/webp"]);
  if (!name || !description || !imageFile || !allowedImageTypes.has(imageFile.type) || imageFile.size > 5 * 1024 * 1024) {
    redirect("/admin/platform?error=invalid_badge");
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
    redirect(`/admin/platform?error=${encodeURIComponent(upload.error.message)}`);
  }

  const { data: publicImage } = supabase.storage.from("badge-images").getPublicUrl(imagePath);
  const { data, error } = await supabase
    .from("badges")
    .insert({ color, created_by: admin.id, description, image_url: publicImage.publicUrl, name })
    .select("id")
    .maybeSingle();
  if (error) throw new Error(error.message);
  revalidatePath("/admin/platform");
  await writeAuditLog({ action: "admin.badge.created", actorId: admin.id, actorType: "admin", entityId: data?.id, entityType: "badge", metadata: { color, hasImage: true, name } });
  redirect("/admin/platform?updated=badge");
}
