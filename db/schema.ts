import {
  boolean,
  index,
  integer,
  numeric,
  primaryKey,
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
export const referralAttributionStatus = pgEnum("referral_attribution_status", ["pending", "qualified", "rejected"]);

export const profiles = pgTable("profiles", {
  id: uuid("id").primaryKey(),
  role: userRole("role").notNull().default("user"),
  status: accountStatus("status").notNull().default("pending_payment"),
  displayName: text("display_name"),
  username: text("username"),
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
  status: referralAttributionStatus("status").notNull().default("pending"),
  qualifiedAt: timestamp("qualified_at", { withTimezone: true }),
  rewardCredits: integer("reward_credits").notNull().default(0),
  rejectionReason: text("rejection_reason"),
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
  mediaUrls: text("media_urls").notNull().default("[]"),
  audioUrl: text("audio_url"),
  likesCount: integer("likes_count").notNull().default(0),
  impressionsCount: integer("impressions_count").notNull().default(0),
  bookmarksCount: integer("bookmarks_count").notNull().default(0),
  commentsCount: integer("comments_count").notNull().default(0),
  sharesCount: integer("shares_count").notNull().default(0),
  videoWatchSecondsTotal: integer("video_watch_seconds_total").notNull().default(0),
  videoWatchSessionsCount: integer("video_watch_sessions_count").notNull().default(0),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const postLikes = pgTable("post_likes", {
  id: uuid("id").defaultRandom().primaryKey(),
  postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  profileId: uuid("profile_id").notNull().references(() => profiles.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("post_likes_post_profile_unique").on(table.postId, table.profileId),
]);

export const postBookmarks = pgTable("post_bookmarks", {
  id: uuid("id").defaultRandom().primaryKey(),
  postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  profileId: uuid("profile_id").notNull().references(() => profiles.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("post_bookmarks_post_profile_unique").on(table.postId, table.profileId),
]);

export const postComments = pgTable("post_comments", {
  id: uuid("id").defaultRandom().primaryKey(),
  postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
  profileId: uuid("profile_id").notNull().references(() => profiles.id),
  body: text("body").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("post_comments_post_created_at_idx").on(table.postId, table.createdAt),
]);

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

export const rewardRules = pgTable("reward_rules", {
  id: uuid("id").defaultRandom().primaryKey(),
  action: text("action").notNull().unique(),
  label: text("label").notNull(),
  credits: integer("credits").notNull().default(0),
  enabled: boolean("enabled").notNull().default(true),
  description: text("description").notNull().default(""),
  minCreditsPerAction: integer("min_credits_per_action").notNull().default(0),
  maxCreditsPerAction: integer("max_credits_per_action"),
  updatedBy: uuid("updated_by").references(() => profiles.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const financeSettings = pgTable("finance_settings", {
  id: uuid("id").defaultRandom().primaryKey(),
  creditsPerUnit: integer("credits_per_unit").notNull().default(100),
  usdPerUnit: numeric("usd_per_unit", { precision: 12, scale: 4 }).notNull().default("0.5000"),
  ngnPerUsd: numeric("ngn_per_usd", { precision: 12, scale: 4 }).notNull().default("1000.0000"),
  active: boolean("active").notNull().default(true),
  updatedBy: uuid("updated_by").references(() => profiles.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const withdrawals = pgTable("withdrawals", {
  id: uuid("id").defaultRandom().primaryKey(),
  profileId: uuid("profile_id").notNull().references(() => profiles.id),
  status: withdrawalStatus("status").notNull().default("pending"),
  amountCredits: integer("amount_credits").notNull(),
  amountNaira: numeric("amount_naira", { precision: 12, scale: 2 }).notNull(),
  creditsPerUnitSnapshot: integer("credits_per_unit_snapshot"),
  usdPerUnitSnapshot: numeric("usd_per_unit_snapshot", { precision: 12, scale: 4 }),
  ngnPerUsdSnapshot: numeric("ngn_per_usd_snapshot", { precision: 12, scale: 4 }),
  ngnPerCreditSnapshot: numeric("ngn_per_credit_snapshot", { precision: 12, scale: 4 }),
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
  maxUploadSizeMb: integer("max_upload_size_mb").notNull().default(50),
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
  recipientProfileId: uuid("recipient_profile_id").references(() => profiles.id, { onDelete: "cascade" }),
  archivedAt: timestamp("archived_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const emailBlasts = pgTable("email_blasts", {
  id: uuid("id").defaultRandom().primaryKey(),
  subject: text("subject").notNull(),
  htmlBody: text("html_body").notNull(),
  audience: notificationAudience("audience").notNull().default("all"),
  status: text("status").notNull().default("draft"),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  failedAt: timestamp("failed_at", { withTimezone: true }),
  errorMessage: text("error_message"),
  recipientCount: integer("recipient_count").notNull().default(0),
  createdBy: uuid("created_by").references(() => profiles.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const badges = pgTable("badges", {
  id: uuid("id").defaultRandom().primaryKey(),
  name: text("name").notNull(),
  color: text("color").notNull().default("#5fd7ff"),
  description: text("description").notNull(),
  imageUrl: text("image_url"),
  createdBy: uuid("created_by").references(() => profiles.id),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const profileBadges = pgTable(
  "profile_badges",
  {
    profileId: uuid("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    badgeId: uuid("badge_id").notNull().references(() => badges.id, { onDelete: "cascade" }),
    assignedBy: uuid("assigned_by").references(() => profiles.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.profileId, table.badgeId] }),
  ],
);

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

export const systemFailures = pgTable("system_failures", {
  id: uuid("id").defaultRandom().primaryKey(),
  category: text("category").notNull(),
  message: text("message").notNull(),
  metadata: text("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const rateLimitBuckets = pgTable("rate_limit_buckets", {
  bucketKey: text("bucket_key").primaryKey(),
  attempts: integer("attempts").notNull().default(0),
  windowStartedAt: timestamp("window_started_at", { withTimezone: true }).notNull().defaultNow(),
  resetAt: timestamp("reset_at", { withTimezone: true }).notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index("rate_limit_buckets_reset_at_idx").on(table.resetAt),
]);

export const notificationReads = pgTable(
  "notification_reads",
  {
    notificationId: uuid("notification_id").notNull().references(() => platformNotifications.id, { onDelete: "cascade" }),
    profileId: uuid("profile_id").notNull().references(() => profiles.id, { onDelete: "cascade" }),
    readAt: timestamp("read_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({ columns: [table.notificationId, table.profileId] }),
  ],
);
