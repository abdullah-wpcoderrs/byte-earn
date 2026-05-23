"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { eq, inArray, sql } from "drizzle-orm";
import {
  badges,
  creditLedger,
  emailBlasts,
  platformNotifications,
  platformSettings,
  posts,
  profiles,
  withdrawals,
} from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { getDb } from "@/lib/db";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function textValue(formData: FormData, key: string, fallback = "") {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : fallback;
}

function intValue(formData: FormData, key: string) {
  const value = Number(textValue(formData, key).replace(/,/g, ""));
  return Number.isInteger(value) ? value : 0;
}

function selectedIds(formData: FormData, key: string) {
  return formData
    .getAll(key)
    .filter((value): value is string => typeof value === "string" && uuidPattern.test(value));
}

export async function bulkUserAction(formData: FormData) {
  const admin = await requireAdmin();
  const action = textValue(formData, "bulkAction");
  const ids = selectedIds(formData, "userIds").filter((id) => id !== admin.id);
  const credits = Math.abs(intValue(formData, "credits"));
  const reason = textValue(formData, "reason", "Admin adjustment").slice(0, 160);

  if (ids.length === 0) {
    redirect("/admin/users?error=no_users");
  }

  const db = getDb();

  if (action === "credit" || action === "deduct") {
    if (credits <= 0) {
      redirect("/admin/users?error=invalid_credits");
    }

    const signedCredits = action === "credit" ? credits : -credits;
    const source = action === "credit" ? ("admin_credit" as const) : ("adjustment" as const);
    await db.transaction(async (tx) => {
      await tx
        .update(profiles)
        .set({
          creditsBalance: sql`${profiles.creditsBalance} + ${signedCredits}`,
          updatedAt: new Date(),
        })
        .where(inArray(profiles.id, ids));

      await tx.insert(creditLedger).values(
        ids.map((profileId) => ({
          credits: signedCredits,
          description: reason,
          profileId,
          source,
        })),
      );
    });
  }

  if (action === "remove") {
    const users = await db
      .select({ creditsBalance: profiles.creditsBalance, id: profiles.id })
      .from(profiles)
      .where(inArray(profiles.id, ids));

    await db.transaction(async (tx) => {
      await tx
        .update(profiles)
        .set({ creditsBalance: 0, updatedAt: new Date() })
        .where(inArray(profiles.id, ids));

      const adjustments = users
        .filter((user) => user.creditsBalance !== 0)
        .map((user) => ({
          credits: -user.creditsBalance,
          description: reason || "Admin balance removal",
          profileId: user.id,
          source: "adjustment" as const,
        }));

      if (adjustments.length > 0) {
        await tx.insert(creditLedger).values(adjustments);
      }
    });
  }

  if (action === "suspend") {
    await db.update(profiles).set({ status: "suspended", updatedAt: new Date() }).where(inArray(profiles.id, ids));
  }

  if (action === "delete") {
    await db
      .update(profiles)
      .set({
        accountName: null,
        accountNumber: null,
        bankName: null,
        creditsBalance: 0,
        displayName: "Deleted user",
        status: "suspended",
        updatedAt: new Date(),
      })
      .where(inArray(profiles.id, ids));
  }

  revalidatePath("/admin/users");
  redirect("/admin/users?updated=users");
}

export async function moderatePostAction(formData: FormData) {
  const admin = await requireAdmin();
  const postId = textValue(formData, "postId");
  const action = textValue(formData, "moderationAction");
  const message = textValue(formData, "message", "Your post was rejected by moderation.").slice(0, 240);

  if (!uuidPattern.test(postId)) {
    redirect("/admin/moderation?error=invalid_post");
  }

  const db = getDb();
  const post = await db.query.posts.findFirst({
    columns: { authorId: true, id: true },
    where: eq(posts.id, postId),
  });

  if (!post) {
    redirect("/admin/moderation?error=missing_post");
  }

  if (action === "publish") {
    await db.update(posts).set({ status: "published" }).where(eq(posts.id, postId));
  }

  if (action === "reject") {
    await db.transaction(async (tx) => {
      await tx.update(posts).set({ status: "rejected" }).where(eq(posts.id, postId));
      await tx.insert(platformNotifications).values({
        audience: "all",
        body: message,
        createdBy: admin.id,
        title: "Post rejected",
      });
    });
  }

  if (action === "delete") {
    await db.delete(posts).where(eq(posts.id, postId));
  }

  revalidatePath("/admin/moderation");
  redirect("/admin/moderation?updated=moderation");
}

export async function reviewWithdrawalAction(formData: FormData) {
  const admin = await requireAdmin();
  const withdrawalId = textValue(formData, "withdrawalId");
  const action = textValue(formData, "reviewAction");
  const note = textValue(formData, "reviewNote").slice(0, 240);

  if (!uuidPattern.test(withdrawalId)) {
    redirect("/admin/withdrawals?error=invalid_withdrawal");
  }

  const nextStatus =
    action === "approve"
      ? ("approved" as const)
      : action === "paid"
        ? ("paid" as const)
        : action === "reject"
          ? ("rejected" as const)
          : null;

  if (!nextStatus) {
    redirect("/admin/withdrawals?error=invalid_action");
  }

  const db = getDb();
  const request = await db.query.withdrawals.findFirst({
    columns: {
      amountCredits: true,
      amountNaira: true,
      id: true,
      profileId: true,
      status: true,
    },
    where: eq(withdrawals.id, withdrawalId),
  });

  if (!request) {
    redirect("/admin/withdrawals?error=missing_withdrawal");
  }

  const canTransition =
    (request.status === "pending" && (nextStatus === "approved" || nextStatus === "rejected")) ||
    (request.status === "approved" && nextStatus === "paid");

  if (!canTransition) {
    redirect("/admin/withdrawals?error=invalid_transition");
  }

  await db.transaction(async (tx) => {
    await tx
      .update(withdrawals)
      .set({
        reviewNote: note || null,
        reviewedAt: new Date(),
        reviewedBy: admin.id,
        status: nextStatus,
      })
      .where(eq(withdrawals.id, withdrawalId));

    await tx.insert(platformNotifications).values({
      audience: "all",
      body:
        nextStatus === "approved"
          ? `Your withdrawal request for NGN ${request.amountNaira} was approved.`
          : nextStatus === "paid"
            ? `Your withdrawal request for NGN ${request.amountNaira} was marked as paid.`
            : `Your withdrawal request for NGN ${request.amountNaira} was rejected.${note ? ` ${note}` : ""}`,
      createdBy: admin.id,
      title: `Withdrawal ${nextStatus}`,
    });

    if (nextStatus === "paid") {
      await tx
        .update(profiles)
        .set({
          creditsBalance: sql`${profiles.creditsBalance} - ${Math.abs(request.amountCredits)}`,
          updatedAt: new Date(),
        })
        .where(eq(profiles.id, request.profileId));

      await tx.insert(creditLedger).values({
        credits: -Math.abs(request.amountCredits),
        description: `Withdrawal paid: NGN ${request.amountNaira}`,
        profileId: request.profileId,
        source: "adjustment",
      });
    }
  });

  revalidatePath("/admin/withdrawals");
  revalidatePath("/admin");
  redirect("/admin/withdrawals?updated=withdrawal");
}

export async function updateLeaderboardSettingsAction(formData: FormData) {
  await requireAdmin();
  const settingsId = textValue(formData, "settingsId");
  const values = {
    leaderboardStrictMode: formData.get("leaderboardStrictMode") === "on",
    leaderboardUsesBookmarks: formData.get("leaderboardUsesBookmarks") === "on",
    leaderboardUsesEngagement: formData.get("leaderboardUsesEngagement") === "on",
    leaderboardUsesReferrals: formData.get("leaderboardUsesReferrals") === "on",
    leaderboardUsesWatchTime: formData.get("leaderboardUsesWatchTime") === "on",
    updatedAt: new Date(),
  };

  if (uuidPattern.test(settingsId)) {
    await getDb().update(platformSettings).set(values).where(eq(platformSettings.id, settingsId));
  } else {
    await getDb().insert(platformSettings).values(values);
  }

  revalidatePath("/admin/leaderboard");
}

export async function updatePlatformSettingsAction(formData: FormData) {
  await requireAdmin();
  const settingsId = textValue(formData, "settingsId");
  const values = {
    dailyWatchLimitSeconds: Math.max(60, intValue(formData, "dailyWatchLimitSeconds")),
    postApprovalRequired: formData.get("postApprovalRequired") === "on",
    sponsoredWithdrawalsUnlocked: formData.get("sponsoredWithdrawalsUnlocked") === "on",
    underConstruction: formData.get("underConstruction") === "on",
    updatedAt: new Date(),
  };

  if (uuidPattern.test(settingsId)) {
    await getDb().update(platformSettings).set(values).where(eq(platformSettings.id, settingsId));
  } else {
    await getDb().insert(platformSettings).values(values);
  }

  revalidatePath("/admin/platform");
}

export async function createNotificationAction(formData: FormData) {
  const admin = await requireAdmin();
  const title = textValue(formData, "title").slice(0, 80);
  const body = textValue(formData, "body").slice(0, 600);
  const audience = textValue(formData, "audience") as "all" | "active" | "suspended";

  if (!title || !body || !["all", "active", "suspended"].includes(audience)) {
    redirect("/admin/platform?error=invalid_notification");
  }

  await getDb().insert(platformNotifications).values({ audience, body, createdBy: admin.id, title });
  revalidatePath("/admin/platform");
}

export async function createEmailBlastAction(formData: FormData) {
  const admin = await requireAdmin();
  const subject = textValue(formData, "subject").slice(0, 120);
  const htmlBody = textValue(formData, "htmlBody").slice(0, 5000);
  const audience = textValue(formData, "audience") as "all" | "active" | "suspended";

  if (!subject || !htmlBody || !["all", "active", "suspended"].includes(audience)) {
    redirect("/admin/platform?error=invalid_email");
  }

  await getDb().insert(emailBlasts).values({ audience, createdBy: admin.id, htmlBody, subject });
  revalidatePath("/admin/platform");
}

export async function createBadgeAction(formData: FormData) {
  const admin = await requireAdmin();
  const name = textValue(formData, "name").slice(0, 48);
  const color = textValue(formData, "color", "#5fd7ff").slice(0, 24);
  const description = textValue(formData, "description").slice(0, 180);

  if (!name || !description) {
    redirect("/admin/platform?error=invalid_badge");
  }

  await getDb().insert(badges).values({ color, createdBy: admin.id, description, name });
  revalidatePath("/admin/platform");
}
