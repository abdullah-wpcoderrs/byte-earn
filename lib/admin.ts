import "server-only";

import { redirect } from "next/navigation";
import { getOrCreateFinanceSettings } from "@/lib/finance-settings";
import { defaultPlatformSettings, type PlatformSettings } from "@/lib/platform-settings";
import { generateReferralCode } from "@/lib/referrals";
import { createAdminClient, hasSupabaseAdminKey } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type AdminSession = {
  id: string;
  email: string | null;
  displayName: string | null;
};

export type AdminUserFilters = {
  earningMax?: number;
  earningMin?: number;
  page?: number;
  percentile?: "top10" | "top25" | "bottom25";
  q?: string;
};

export type AdminUserRow = Awaited<ReturnType<typeof getAdminUsers>>["rows"][number];
export type AdminRewardRule = Awaited<ReturnType<typeof getRewardRules>>[number];
export type WithdrawalReviewScope = "history" | "requests";

function relationDisplayName(value: unknown) {
  if (Array.isArray(value)) {
    return (value[0] as { display_name?: string | null } | undefined)?.display_name ?? null;
  }

  return (value as { display_name?: string | null } | null | undefined)?.display_name ?? null;
}

async function createUniqueAdminReferralCode(supabase: ReturnType<typeof createAdminClient>) {
  for (let attempt = 0; attempt < 5; attempt += 1) {
    const referralCode = generateReferralCode();
    const { data, error } = await supabase.from("profiles").select("id").eq("referral_code", referralCode).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return referralCode;
  }

  return `${generateReferralCode()}${Date.now().toString(36).toUpperCase()}`;
}

async function syncMissingAuthProfiles(supabase: ReturnType<typeof createAdminClient>) {
  const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (authError) throw new Error(authError.message);

  const userIds = authUsers.users.map((user) => user.id);
  if (userIds.length === 0) return;

  const { data: profiles, error: profilesError } = await supabase.from("profiles").select("id").in("id", userIds);
  if (profilesError) throw new Error(profilesError.message);

  const existingIds = new Set((profiles ?? []).map((profile) => profile.id));
  const missingUsers = authUsers.users.filter((user) => !existingIds.has(user.id));
  if (missingUsers.length === 0) return;

  const rows = await Promise.all(
    missingUsers.map(async (user) => {
      const role = user.app_metadata?.role === "admin" ? "admin" : "user";
      const displayName =
        typeof user.user_metadata?.display_name === "string" && user.user_metadata.display_name.trim()
          ? user.user_metadata.display_name.trim()
          : user.email?.split("@")[0] ?? "Unnamed user";

      return {
        display_name: displayName,
        id: user.id,
        referral_code: await createUniqueAdminReferralCode(supabase),
        role,
        status: role === "admin" ? "active" : "onboarding",
        updated_at: new Date().toISOString(),
      };
    }),
  );

  const { error: insertError } = await supabase.from("profiles").insert(rows);
  if (insertError) throw new Error(insertError.message);
}

export async function requireAdmin(): Promise<AdminSession> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/?admin=signin");
  }

  const { data: profile, error } = await supabase
    .from("profiles")
    .select("id, display_name, role, status")
    .eq("id", user.id)
    .maybeSingle();

  if (error || !profile || profile.role !== "admin" || profile.status === "suspended") {
    redirect("/feed?admin=forbidden");
  }

  return {
    displayName: profile.display_name,
    email: user.email ?? null,
    id: user.id,
  };
}

type SupabaseQueryClient = Awaited<ReturnType<typeof createClient>> | ReturnType<typeof createAdminClient>;

async function countRows(client: SupabaseQueryClient, table: "badges" | "posts" | "profiles" | "withdrawals", filters?: Record<string, string>) {
  const supabase = client;
  let query = supabase.from(table).select("id", { count: "exact", head: true });

  Object.entries(filters ?? {}).forEach(([key, value]) => {
    query = query.eq(key, value);
  });

  const { count, error } = await query;
  if (error) {
    throw new Error(error.message);
  }
  return count ?? 0;
}

export async function getAdminStats() {
  await requireAdmin();
  const supabase = hasSupabaseAdminKey() ? createAdminClient() : await createClient();

  if (hasSupabaseAdminKey()) {
    await syncMissingAuthProfiles(supabase as ReturnType<typeof createAdminClient>);
  }

  const [users, pendingPosts, pendingWithdrawals, badges] = await Promise.all([
    countRows(supabase, "profiles"),
    countRows(supabase, "posts", { status: "pending" }),
    countRows(supabase, "withdrawals", { status: "pending" }),
    countRows(supabase, "badges"),
  ]);

  return { badges, pendingPosts, pendingWithdrawals, users };
}

export async function getOrCreatePlatformSettings() {
  await requireAdmin();
  const supabase = hasSupabaseAdminKey() ? createAdminClient() : await createClient();
  const { data: existing, error } = await supabase
    .from("platform_settings")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (existing) {
    return existing;
  }

  const { data: created, error: createError } = await supabase.from("platform_settings").insert({}).select("*").single();
  if (createError) {
    return defaultPlatformSettings;
  }
  return created;
}

export async function getRewardRules() {
  await requireAdmin();
  const supabase = hasSupabaseAdminKey() ? createAdminClient() : await createClient();
  const { data, error } = await supabase
    .from("reward_rules")
    .select("id, action, label, credits, enabled, description, min_credits_per_action, max_credits_per_action, updated_at")
    .order("action", { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((rule) => ({
    action: rule.action,
    credits: rule.credits,
    description: rule.description,
    enabled: rule.enabled,
    id: rule.id,
    label: rule.label,
    maxCreditsPerAction: rule.max_credits_per_action,
    minCreditsPerAction: rule.min_credits_per_action,
    updatedAt: rule.updated_at,
  }));
}

export async function getRewardConfiguration() {
  const [rules, financeSettings] = await Promise.all([
    getRewardRules(),
    getOrCreateFinanceSettings(),
  ]);

  return { financeSettings, rules };
}

export async function getAdminUsers(filters: AdminUserFilters) {
  await requireAdmin();
  const usesAdminClient = hasSupabaseAdminKey();
  const supabase = usesAdminClient ? createAdminClient() : await createClient();
  if (usesAdminClient) {
    await syncMissingAuthProfiles(supabase as ReturnType<typeof createAdminClient>);
  }
  const pageSize = 12;
  const page = Math.max(1, filters.page ?? 1);
  let countQuery = supabase.from("profiles").select("id", { count: "exact", head: true });
  let rowsQuery = supabase
    .from("profiles")
    .select(
      "id, display_name, referral_code, referred_by, referral_count, credits_balance, sponsored_credits_locked, role, status, bank_name, account_number, account_name, created_at, updated_at",
    )
    .order("referral_count", { ascending: filters.percentile === "bottom25" })
    .order("created_at", { ascending: false })
    .range((page - 1) * pageSize, page * pageSize - 1);

  if (filters.q) {
    const safeQ = filters.q.replace(/[%(),]/g, "");
    const expression = `display_name.ilike.%${safeQ}%,referral_code.ilike.%${safeQ}%`;
    countQuery = countQuery.or(expression);
    rowsQuery = rowsQuery.or(expression);
  }

  if (Number.isFinite(filters.earningMin)) {
    countQuery = countQuery.gte("credits_balance", filters.earningMin ?? 0);
    rowsQuery = rowsQuery.gte("credits_balance", filters.earningMin ?? 0);
  }

  if (Number.isFinite(filters.earningMax)) {
    countQuery = countQuery.lte("credits_balance", filters.earningMax ?? 0);
    rowsQuery = rowsQuery.lte("credits_balance", filters.earningMax ?? 0);
  }

  const [{ count, error: countError }, { data, error: rowsError }] = await Promise.all([countQuery, rowsQuery]);
  if (countError) {
    throw new Error(countError.message);
  }
  if (rowsError) {
    throw new Error(rowsError.message);
  }

  const total = count ?? 0;
  const limit =
    filters.percentile === "top10"
      ? Math.max(1, Math.ceil(total * 0.1))
      : filters.percentile === "top25" || filters.percentile === "bottom25"
        ? Math.max(1, Math.ceil(total * 0.25))
        : null;

  return {
    page,
    pageSize,
    rows: (limit ? (data ?? []).slice(0, limit) : data ?? []).map((user) => ({
      accountName: user.account_name,
      accountNumber: user.account_number,
      bankName: user.bank_name,
      createdAt: user.created_at,
      creditsBalance: user.credits_balance,
      displayName: user.display_name,
      id: user.id,
      referralCode: user.referral_code,
      referralCount: user.referral_count,
      referredBy: user.referred_by,
      role: user.role,
      sponsoredCreditsLocked: user.sponsored_credits_locked,
      status: user.status,
      updatedAt: user.updated_at,
    })),
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getModerationPosts(status?: "pending" | "published" | "rejected") {
  await requireAdmin();
  const supabase = await createClient();
  let query = supabase
    .from("posts")
    .select("id, type, status, caption, media_url, likes_count, comments_count, created_at, profiles:author_id(display_name)")
    .order("created_at", { ascending: false })
    .limit(40);

  if (status) {
    query = query.eq("status", status);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((post) => ({
    authorName: relationDisplayName(post.profiles),
    caption: post.caption,
    commentsCount: post.comments_count,
    createdAt: new Date(post.created_at),
    id: post.id,
    likesCount: post.likes_count,
    mediaUrl: post.media_url,
    status: post.status,
    type: post.type,
  }));
}

export async function getLeaderboardRows(settings: PlatformSettings = defaultPlatformSettings) {
  const supabase = await createClient();
  const [{ data: profiles, error }, { data: posts, error: postsError }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, display_name, referral_count, credits_balance, status")
      .neq("status", "pending_payment")
      .limit(100),
    supabase
      .from("posts")
      .select("author_id, likes_count, comments_count, bookmarks_count")
      .eq("status", "published")
      .limit(1000),
  ]);

  if (error) {
    throw new Error(error.message);
  }
  if (postsError) {
    throw new Error(postsError.message);
  }

  const engagementByProfile = new Map<string, { bookmarks: number; engagement: number }>();
  (posts ?? []).forEach((post) => {
    const current = engagementByProfile.get(post.author_id) ?? { bookmarks: 0, engagement: 0 };
    current.bookmarks += post.bookmarks_count ?? 0;
    current.engagement += (post.likes_count ?? 0) + (post.comments_count ?? 0);
    engagementByProfile.set(post.author_id, current);
  });

  return (profiles ?? [])
    .map((row) => ({
      creditsBalance: row.credits_balance,
      displayName: row.display_name,
      id: row.id,
      referralCount: row.referral_count,
      score:
        (settings.leaderboard_uses_referrals ? row.referral_count * 100 : 0) +
        (settings.leaderboard_uses_watch_time ? row.credits_balance : 0) +
        (settings.leaderboard_uses_engagement ? (engagementByProfile.get(row.id)?.engagement ?? 0) * 10 : 0) +
        (settings.leaderboard_uses_bookmarks ? (engagementByProfile.get(row.id)?.bookmarks ?? 0) * 15 : 0),
      status: row.status,
    }))
    .filter((row) => (settings.leaderboard_strict_mode ? row.score > 0 : true))
    .sort((a, b) => b.score - a.score)
    .slice(0, 25);
}

export async function getWithdrawalRequests({
  scope = "requests",
  status,
}: {
  scope?: WithdrawalReviewScope;
  status?: "pending" | "approved" | "paid" | "rejected";
} = {}) {
  await requireAdmin();
  const supabase = hasSupabaseAdminKey() ? createAdminClient() : await createClient();
  const baseSelect = "id, profile_id, status, amount_credits, amount_naira, bank_name, account_number, account_name, created_at, reviewed_at, review_note, profiles:profile_id(display_name)";
  let query = supabase
    .from("withdrawals")
    .select(baseSelect)
    .order("created_at", { ascending: false })
    .limit(60);

  if (status) {
    query = query.eq("status", status);
  } else if (scope === "history") {
    query = query.in("status", ["paid", "rejected"]);
  } else {
    query = query.in("status", ["pending", "approved"]);
  }

  const primaryResult = await query;
  const rows = primaryResult.error?.message.includes("reviewed_at") || primaryResult.error?.message.includes("review_note")
    ? await supabase
      .from("withdrawals")
      .select("id, profile_id, status, amount_credits, amount_naira, bank_name, account_number, account_name, created_at, profiles:profile_id(display_name)")
      .order("created_at", { ascending: false })
      .limit(60)
    : primaryResult;

  const { data, error } = rows;
  if (error) {
    throw new Error(error.message);
  }

  const scopedRows = (data ?? []).filter((row) => {
    if (status) return row.status === status;
    return scope === "history" ? ["paid", "rejected"].includes(row.status) : ["pending", "approved"].includes(row.status);
  });

  return scopedRows.map((row) => ({
    accountName: row.account_name,
    accountNumber: row.account_number,
    amountCredits: row.amount_credits,
    amountNaira: row.amount_naira,
    bankName: row.bank_name,
    createdAt: new Date(row.created_at),
    displayName: relationDisplayName(row.profiles),
    id: row.id,
    profileId: row.profile_id,
    reviewNote: "review_note" in row ? row.review_note as string | null : null,
    reviewedAt: "reviewed_at" in row && row.reviewed_at ? new Date(row.reviewed_at as string) : null,
    status: row.status,
  }));
}

export async function getAuditLogRows() {
  await requireAdmin();
  const supabase = hasSupabaseAdminKey() ? createAdminClient() : await createClient();
  const { data, error } = await supabase
    .from("audit_logs")
    .select("id, action, actor_id, actor_type, entity_type, entity_id, metadata, created_at, profiles:actor_id(display_name)")
    .order("created_at", { ascending: false })
    .limit(120);

  if (error) {
    const missingAuditTable =
      error.code === "PGRST205" ||
      error.message.includes("audit_logs") && (
        error.message.includes("schema cache") ||
        error.message.includes("does not exist") ||
        error.message.includes("Could not find the table")
      );

    if (missingAuditTable) {
      return [];
    }

    throw new Error(error.message);
  }

  return (data ?? []).map((row) => ({
    action: row.action,
    actorId: row.actor_id as string | null,
    actorName: relationDisplayName(row.profiles),
    actorType: row.actor_type as string,
    createdAt: new Date(row.created_at),
    entityId: row.entity_id as string | null,
    entityType: row.entity_type,
    id: row.id,
    metadata: row.metadata as string | null,
  }));
}

export async function getEmailBlastHistory() {
  await requireAdmin();
  const supabase = hasSupabaseAdminKey() ? createAdminClient() : await createClient();
  const primaryResult = await supabase
    .from("email_blasts")
    .select("id, subject, html_body, audience, status, recipient_count, sent_at, failed_at, error_message, created_at, profiles:created_by(display_name)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (primaryResult.error && !primaryResult.error.message.includes("status")) {
    throw new Error(primaryResult.error.message);
  }

  const rows = primaryResult.error?.message.includes("status")
    ? await supabase
      .from("email_blasts")
      .select("id, subject, html_body, audience, created_at, profiles:created_by(display_name)")
      .order("created_at", { ascending: false })
      .limit(100)
    : primaryResult;

  if (rows.error) {
    throw new Error(rows.error.message);
  }

  return (rows.data ?? []).map((blast) => ({
    audience: blast.audience,
    bodyPreview: blast.html_body.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim().slice(0, 140),
    createdAt: new Date(blast.created_at),
    createdBy: relationDisplayName(blast.profiles),
    errorMessage: "error_message" in blast ? (blast.error_message as string | null) : null,
    failedAt: "failed_at" in blast && blast.failed_at ? new Date(blast.failed_at as string) : null,
    id: blast.id,
    recipientCount: "recipient_count" in blast ? (blast.recipient_count as number) : 0,
    sentAt: "sent_at" in blast && blast.sent_at ? new Date(blast.sent_at as string) : null,
    status: "status" in blast ? (blast.status as string) : "draft",
    subject: blast.subject,
  }));
}

export async function getAdminBadges() {
  await requireAdmin();
  const supabase = hasSupabaseAdminKey() ? createAdminClient() : await createClient();
  const primaryResult = await supabase
    .from("badges")
    .select("id, name, color, description, image_url, created_at, profiles:created_by(display_name)")
    .order("created_at", { ascending: false })
    .limit(100);

  if (primaryResult.error && !primaryResult.error.message.includes("image_url")) {
    throw new Error(primaryResult.error.message);
  }

  const rows = primaryResult.error?.message.includes("image_url")
    ? (await supabase
      .from("badges")
      .select("id, name, color, description, created_at, profiles:created_by(display_name)")
      .order("created_at", { ascending: false })
      .limit(100))
    : primaryResult;

  if (rows.error) {
    throw new Error(rows.error.message);
  }

  return (rows.data ?? []).map((badge) => ({
    color: badge.color,
    createdAt: new Date(badge.created_at),
    createdBy: relationDisplayName(badge.profiles),
    description: badge.description,
    id: badge.id,
    imageUrl: "image_url" in badge ? (badge.image_url as string | null) : null,
    name: badge.name,
  }));
}
