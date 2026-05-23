import "server-only";

import { and, asc, count, desc, eq, gte, ilike, inArray, lte, ne, or, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { badges, creditLedger, platformSettings, posts, profiles, withdrawals } from "@/db/schema";
import { getDb } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

export type AdminSession = {
  id: string;
  email: string | null;
  displayName: string | null;
};

export async function requireAdmin(): Promise<AdminSession> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/?admin=signin");
  }

  const profile = await getDb().query.profiles.findFirst({
    columns: {
      id: true,
      displayName: true,
      role: true,
      status: true,
    },
    where: eq(profiles.id, user.id),
  });

  if (!profile || profile.role !== "admin" || profile.status === "suspended") {
    redirect("/feed?admin=forbidden");
  }

  return {
    displayName: profile.displayName,
    email: user.email ?? null,
    id: user.id,
  };
}

export async function getAdminStats() {
  const db = getDb();
  const [usersTotal] = await db.select({ value: count() }).from(profiles);
  const [pendingPosts] = await db.select({ value: count() }).from(posts).where(eq(posts.status, "pending"));
  const [pendingWithdrawals] = await db.select({ value: count() }).from(withdrawals).where(eq(withdrawals.status, "pending"));
  const [badgeTotal] = await db.select({ value: count() }).from(badges);

  return {
    badges: badgeTotal?.value ?? 0,
    pendingPosts: pendingPosts?.value ?? 0,
    pendingWithdrawals: pendingWithdrawals?.value ?? 0,
    users: usersTotal?.value ?? 0,
  };
}

export async function getOrCreatePlatformSettings() {
  const db = getDb();
  const existing = await db.query.platformSettings.findFirst({
    orderBy: desc(platformSettings.updatedAt),
  });

  if (existing) {
    return existing;
  }

  const [created] = await db.insert(platformSettings).values({}).returning();
  return created;
}

export type AdminUserFilters = {
  earningMax?: number;
  earningMin?: number;
  page?: number;
  percentile?: "top10" | "top25" | "bottom25";
  q?: string;
};

export async function getAdminUsers(filters: AdminUserFilters) {
  const pageSize = 12;
  const page = Math.max(1, filters.page ?? 1);
  const whereParts = [
    filters.q
      ? or(ilike(profiles.displayName, `%${filters.q}%`), ilike(profiles.referralCode, `%${filters.q}%`))
      : undefined,
    Number.isFinite(filters.earningMin) ? gte(profiles.creditsBalance, filters.earningMin ?? 0) : undefined,
    Number.isFinite(filters.earningMax) ? lte(profiles.creditsBalance, filters.earningMax ?? 0) : undefined,
  ].filter(Boolean);

  const where = whereParts.length > 0 ? and(...whereParts) : undefined;
  const db = getDb();
  const [totalRow] = await db.select({ value: count() }).from(profiles).where(where);
  const total = totalRow?.value ?? 0;
  const rows = await db
    .select({
      createdAt: profiles.createdAt,
      creditsBalance: profiles.creditsBalance,
      displayName: profiles.displayName,
      id: profiles.id,
      referralCode: profiles.referralCode,
      referralCount: profiles.referralCount,
      role: profiles.role,
      status: profiles.status,
    })
    .from(profiles)
    .where(where)
    .orderBy(
      filters.percentile === "bottom25" ? asc(profiles.referralCount) : desc(profiles.referralCount),
      desc(profiles.createdAt),
    )
    .limit(pageSize)
    .offset((page - 1) * pageSize);

  const limit =
    filters.percentile === "top10"
      ? Math.max(1, Math.ceil(total * 0.1))
      : filters.percentile === "top25" || filters.percentile === "bottom25"
        ? Math.max(1, Math.ceil(total * 0.25))
        : null;

  return {
    page,
    pageSize,
    rows: limit ? rows.slice(0, limit) : rows,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getModerationPosts(status?: "pending" | "published" | "rejected") {
  return getDb()
    .select({
      authorName: profiles.displayName,
      caption: posts.caption,
      commentsCount: posts.commentsCount,
      createdAt: posts.createdAt,
      id: posts.id,
      likesCount: posts.likesCount,
      mediaUrl: posts.mediaUrl,
      status: posts.status,
      type: posts.type,
    })
    .from(posts)
    .leftJoin(profiles, eq(posts.authorId, profiles.id))
    .where(status ? eq(posts.status, status) : undefined)
    .orderBy(desc(posts.createdAt))
    .limit(40);
}

export async function getLeaderboardRows() {
  return getDb()
    .select({
      creditsBalance: profiles.creditsBalance,
      displayName: profiles.displayName,
      id: profiles.id,
      referralCount: profiles.referralCount,
      score: sql<number>`${profiles.referralCount} * 100 + ${profiles.creditsBalance}`,
      status: profiles.status,
    })
    .from(profiles)
    .where(ne(profiles.status, "pending_payment"))
    .orderBy(desc(sql`${profiles.referralCount} * 100 + ${profiles.creditsBalance}`))
    .limit(25);
}

export async function getWithdrawalRequests(status?: "pending" | "approved" | "paid" | "rejected") {
  return getDb()
    .select({
      accountName: withdrawals.accountName,
      accountNumber: withdrawals.accountNumber,
      amountCredits: withdrawals.amountCredits,
      amountNaira: withdrawals.amountNaira,
      bankName: withdrawals.bankName,
      createdAt: withdrawals.createdAt,
      displayName: profiles.displayName,
      id: withdrawals.id,
      profileId: withdrawals.profileId,
      reviewNote: withdrawals.reviewNote,
      reviewedAt: withdrawals.reviewedAt,
      status: withdrawals.status,
    })
    .from(withdrawals)
    .leftJoin(profiles, eq(withdrawals.profileId, profiles.id))
    .where(status ? eq(withdrawals.status, status) : undefined)
    .orderBy(desc(withdrawals.createdAt))
    .limit(60);
}

export { creditLedger, inArray, profiles };
