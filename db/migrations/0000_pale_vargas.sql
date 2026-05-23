CREATE TYPE "public"."account_status" AS ENUM('pending_payment', 'onboarding', 'active', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."earning_source" AS ENUM('referral', 'sponsored_task', 'watch_time', 'admin_credit', 'adjustment');--> statement-breakpoint
CREATE TYPE "public"."post_status" AS ENUM('pending', 'published', 'rejected');--> statement-breakpoint
CREATE TYPE "public"."post_type" AS ENUM('image_text', 'video_text', 'image_audio');--> statement-breakpoint
CREATE TYPE "public"."signup_payment_status" AS ENUM('initialized', 'success', 'failed', 'abandoned');--> statement-breakpoint
CREATE TYPE "public"."user_role" AS ENUM('user', 'admin');--> statement-breakpoint
CREATE TYPE "public"."withdrawal_status" AS ENUM('pending', 'approved', 'paid', 'rejected');--> statement-breakpoint
CREATE TABLE "credit_ledger" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"source" "earning_source" NOT NULL,
	"credits" integer NOT NULL,
	"description" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "platform_settings" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"post_approval_required" boolean DEFAULT true NOT NULL,
	"under_construction" boolean DEFAULT false NOT NULL,
	"sponsored_withdrawals_unlocked" boolean DEFAULT false NOT NULL,
	"daily_watch_limit_seconds" integer DEFAULT 1800 NOT NULL,
	"leaderboard_strict_mode" boolean DEFAULT true NOT NULL,
	"leaderboard_uses_referrals" boolean DEFAULT true NOT NULL,
	"leaderboard_uses_engagement" boolean DEFAULT true NOT NULL,
	"leaderboard_uses_bookmarks" boolean DEFAULT false NOT NULL,
	"leaderboard_uses_watch_time" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "posts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"author_id" uuid NOT NULL,
	"type" "post_type" NOT NULL,
	"status" "post_status" DEFAULT 'pending' NOT NULL,
	"caption" text NOT NULL,
	"media_url" text NOT NULL,
	"audio_url" text,
	"likes_count" integer DEFAULT 0 NOT NULL,
	"bookmarks_count" integer DEFAULT 0 NOT NULL,
	"comments_count" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "profiles" (
	"id" uuid PRIMARY KEY NOT NULL,
	"role" "user_role" DEFAULT 'user' NOT NULL,
	"status" "account_status" DEFAULT 'pending_payment' NOT NULL,
	"display_name" text,
	"referral_code" text NOT NULL,
	"referred_by" uuid,
	"bank_name" text,
	"account_number" text,
	"account_name" text,
	"referral_count" integer DEFAULT 0 NOT NULL,
	"credits_balance" integer DEFAULT 0 NOT NULL,
	"sponsored_credits_locked" boolean DEFAULT true NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "profiles_referral_code_unique" UNIQUE("referral_code")
);
--> statement-breakpoint
CREATE TABLE "referral_attributions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"referrer_id" uuid,
	"referred_profile_id" uuid NOT NULL,
	"referral_code" text NOT NULL,
	"source" text DEFAULT 'signup' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "signup_payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"status" "signup_payment_status" DEFAULT 'initialized' NOT NULL,
	"provider" text DEFAULT 'paystack' NOT NULL,
	"reference" text NOT NULL,
	"authorization_url" text,
	"access_code" text,
	"amount_kobo" integer NOT NULL,
	"currency" text DEFAULT 'NGN' NOT NULL,
	"provider_message" text,
	"paid_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "signup_payments_reference_unique" UNIQUE("reference")
);
--> statement-breakpoint
CREATE TABLE "withdrawals" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"profile_id" uuid NOT NULL,
	"status" "withdrawal_status" DEFAULT 'pending' NOT NULL,
	"amount_credits" integer NOT NULL,
	"amount_naira" numeric(12, 2) NOT NULL,
	"bank_name" text NOT NULL,
	"account_number" text NOT NULL,
	"account_name" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "credit_ledger" ADD CONSTRAINT "credit_ledger_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "posts" ADD CONSTRAINT "posts_author_id_profiles_id_fk" FOREIGN KEY ("author_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_attributions" ADD CONSTRAINT "referral_attributions_referrer_id_profiles_id_fk" FOREIGN KEY ("referrer_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "referral_attributions" ADD CONSTRAINT "referral_attributions_referred_profile_id_profiles_id_fk" FOREIGN KEY ("referred_profile_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "signup_payments" ADD CONSTRAINT "signup_payments_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "withdrawals" ADD CONSTRAINT "withdrawals_profile_id_profiles_id_fk" FOREIGN KEY ("profile_id") REFERENCES "public"."profiles"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "signup_payments" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
ALTER TABLE "referral_attributions" ENABLE ROW LEVEL SECURITY;
--> statement-breakpoint
CREATE POLICY "profiles_select_own" ON "profiles" FOR SELECT TO authenticated USING ("id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "profiles_insert_own" ON "profiles" FOR INSERT TO authenticated WITH CHECK ("id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "profiles_update_own" ON "profiles" FOR UPDATE TO authenticated USING ("id" = auth.uid()) WITH CHECK ("id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "signup_payments_select_own" ON "signup_payments" FOR SELECT TO authenticated USING ("profile_id" = auth.uid());
--> statement-breakpoint
CREATE POLICY "referral_attributions_select_related" ON "referral_attributions" FOR SELECT TO authenticated USING ("referrer_id" = auth.uid() OR "referred_profile_id" = auth.uid());
