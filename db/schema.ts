import {
  boolean,
  integer,
  numeric,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";

export const userRole = pgEnum("user_role", ["user", "admin"]);
export const accountStatus = pgEnum("account_status", [
  "pending_payment",
  "onboarding",
  "active",
  "suspended",
]);
export const postStatus = pgEnum("post_status", ["pending", "published", "rejected"]);
export const postType = pgEnum("post_type", ["image_text", "video_text", "image_audio"]);
export const earningSource = pgEnum("earning_source", [
  "referral",
  "sponsored_task",
  "watch_time",
  "admin_credit",
  "adjustment",
]);
export const withdrawalStatus = pgEnum("withdrawal_status", [
  "pending",
  "approved",
  "paid",
  "rejected",
]);
export const notificationAudience = pgEnum("notification_audience", ["all", "active", "suspended"]);
export const auditActorType = pgEnum("audit_actor_type", ["user", "admin", "system"]);
export const signupPaymentStatus = pgEnum("signup_payment_status", [
  "initialized",
  "success",
  "failed",
  "abandoned",
]);
export const taskStatus = pgEnum("task_status", ["draft", "active", "paused", "archived"]);

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  role: userRole("role").notNull().default("user"),
  status: accountStatus("status").notNull().default("pending_payment"),
  displayName: text("display_name"),
  referralCode: text("referral_code").notNull().unique(),
  referredBy: uuid("referred_by"),
  bankName: text("bank_name"),
  accountNumber: text("account_number"),
  accountName: text("account_name"),
  referralCount: integer("referral_count").notNull().default(0),
  creditsBalance: integer("credits_balance").notNull().default(0),
  sponsoredCreditsLocked: boolean("sponsored_credits_locked").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const signupPayments = pgTable("signup_payments", {
  id: uuid("id").defaultRandom().primaryKey(),
  profileId: uuid("profile_id").notNull().references(() => profiles.id),
  status: signupPaymentStatus("status").notNull().default("initialized"),
  provider: text("provider").notNull().default("paystack"),
  reference: text("reference").notNull().unique(),
  authorizationUrl: text("authorization_url"),
  accessCode: text("access_code"),
  amountKobo: integer("amount_kobo").notNull(),
  currency: text("currency").notNull().default("NGN"),
  providerMessage: text("provider_message"),
  paidAt: timestamp("paid_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const referralAttributions = pgTable("referral_attributions", {
  id: uuid("id").defaultRandom().primaryKey(),
  referrerId: uuid("referrer_id").references(() => profiles.id),
  referredProfileId: uuid("referred_profile_id").notNull().references(() => profiles.id),
  referralCode: text("referral_code").notNull(),
  source: text("source").notNull().default("signup"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const referralVisits = pgTable("referral_visits", {
  id: uuid("id").defaultRandom().primaryKey(),
  referralCode: text("referral_code").notNull(),
  referrerId: uuid("referrer_id").references(() => profiles.id),
  visitorProfileId: uuid("visitor_profile_id").references(() => profiles.id),
  userAgent: text("user_agent"),
  source: text("source").notNull().default("referral_link"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const posts = pgTable("posts", {
  id: uuid("id").defaultRandom().primaryKey(),
  authorId: uuid("author_id").notNull().references(() => profiles.id),
  type: postType("type").notNull(),
  status: postStatus("status").notNull().default("pending"),
  caption: text("caption").notNull(),
  mediaUrl: text("media_url").notNull(),
  audioUrl: text("audio_url"),
  likesCount: integer("likes_count").notNull().default(0),
  bookmarksCount: integer("bookmarks_count").notNull().default(0),
  commentsCount: integer("comments_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const postLikes = pgTable("post_likes", {
  id: uuid("id").defaultRandom().primaryKey(),
  postId: uuid("post_id").notNull().references(() => posts.id),
  profileId: uuid("profile_id").notNull().references(() => profiles.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const postBookmarks = pgTable("post_bookmarks", {
  id: uuid("id").defaultRandom().primaryKey(),
  postId: uuid("post_id").notNull().references(() => posts.id),
  profileId: uuid("profile_id").notNull().references(() => profiles.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const postComments = pgTable("post_comments", {
  id: uuid("id").defaultRandom().primaryKey(),
  postId: uuid("post_id").notNull().references(() => posts.id),
  profileId: uuid("profile_id").notNull().references(() => profiles.id),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const creditLedger = pgTable("credit_ledger", {
  id: uuid("id").defaultRandom().primaryKey(),
  profileId: uuid("profile_id").notNull().references(() => profiles.id),
  source: earningSource("source").notNull(),
  credits: integer("credits").notNull(),
  description: text("description").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const sponsoredTasks = pgTable("sponsored_tasks", {
  id: uuid("id").defaultRandom().primaryKey(),
  status: taskStatus("status").notNull().default("draft"),
  title: text("title").notNull(),
  sponsorName: text("sponsor_name").notNull(),
  videoUrl: text("video_url").notNull(),
  thumbnailUrl: text("thumbnail_url"),
  milestoneSeconds: integer("milestone_seconds").notNull(),
  rewardCredits: integer("reward_credits").notNull(),
  dailyCapSeconds: integer("daily_cap_seconds").notNull().default(1800),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const taskProgress = pgTable("task_progress", {
  id: uuid("id").defaultRandom().primaryKey(),
  taskId: uuid("task_id").notNull().references(() => sponsoredTasks.id),
  profileId: uuid("profile_id").notNull().references(() => profiles.id),
  watchedSeconds: integer("watched_seconds").notNull().default(0),
  awardedCredits: integer("awarded_credits").notNull().default(0),
  completedMilestones: integer("completed_milestones").notNull().default(0),
  capExhausted: boolean("cap_exhausted").notNull().default(false),
  progressDate: timestamp("progress_date", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const withdrawals = pgTable("withdrawals", {
  id: uuid("id").defaultRandom().primaryKey(),
  profileId: uuid("profile_id").notNull().references(() => profiles.id),
  status: withdrawalStatus("status").notNull().default("pending"),
  amountCredits: integer("amount_credits").notNull(),
  amountNaira: numeric("amount_naira", { precision: 12, scale: 2 }).notNull(),
  bankName: text("bank_name").notNull(),
  accountNumber: text("account_number").notNull(),
  accountName: text("account_name").notNull(),
  reviewedBy: uuid("reviewed_by").references(() => profiles.id),
  reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
  reviewNote: text("review_note"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const platformSettings = pgTable("platform_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  postApprovalRequired: boolean("post_approval_required").notNull().default(true),
  underConstruction: boolean("under_construction").notNull().default(false),
  sponsoredWithdrawalsUnlocked: boolean("sponsored_withdrawals_unlocked").notNull().default(false),
  dailyWatchLimitSeconds: integer("daily_watch_limit_seconds").notNull().default(1800),
  leaderboardStrictMode: boolean("leaderboard_strict_mode").notNull().default(true),
  leaderboardUsesReferrals: boolean("leaderboard_uses_referrals").notNull().default(true),
  leaderboardUsesEngagement: boolean("leaderboard_uses_engagement").notNull().default(true),
  leaderboardUsesBookmarks: boolean("leaderboard_uses_bookmarks").notNull().default(false),
  leaderboardUsesWatchTime: boolean("leaderboard_uses_watch_time").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const platformNotifications = pgTable("platform_notifications", {
  id: uuid("id").defaultRandom().primaryKey(),
  title: text("title").notNull(),
  body: text("body").notNull(),
  audience: notificationAudience("audience").notNull().default("all"),
  createdBy: uuid("created_by").references(() => profiles.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const emailBlasts = pgTable("email_blasts", {
  id: uuid("id").defaultRandom().primaryKey(),
  subject: text("subject").notNull(),
  htmlBody: text("html_body").notNull(),
  audience: notificationAudience("audience").notNull().default("all"),
  createdBy: uuid("created_by").references(() => profiles.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const badges = pgTable("badges", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull().default("#5fd7ff"),
  description: text("description").notNull(),
  createdBy: uuid("created_by").references(() => profiles.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").defaultRandom().primaryKey(),
  actorId: uuid("actor_id").references(() => profiles.id),
  actorType: auditActorType("actor_type").notNull().default("user"),
  action: text("action").notNull(),
  entityType: text("entity_type").notNull(),
  entityId: text("entity_id"),
  metadata: text("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});
