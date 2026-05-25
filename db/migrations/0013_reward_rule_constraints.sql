ALTER TABLE "reward_rules" ADD COLUMN IF NOT EXISTS "min_credits_per_action" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "reward_rules" ADD COLUMN IF NOT EXISTS "max_credits_per_action" integer;
--> statement-breakpoint
ALTER TABLE "reward_rules" DROP CONSTRAINT IF EXISTS "reward_rules_min_credits_nonnegative";
--> statement-breakpoint
ALTER TABLE "reward_rules" ADD CONSTRAINT "reward_rules_min_credits_nonnegative" CHECK ("min_credits_per_action" >= 0);
--> statement-breakpoint
ALTER TABLE "reward_rules" DROP CONSTRAINT IF EXISTS "reward_rules_max_credits_valid";
--> statement-breakpoint
ALTER TABLE "reward_rules" ADD CONSTRAINT "reward_rules_max_credits_valid" CHECK ("max_credits_per_action" IS NULL OR "max_credits_per_action" >= "min_credits_per_action");
--> statement-breakpoint
UPDATE "reward_rules"
SET "description" = 'Default credits awarded for each qualified sponsored task milestone unless a task-specific value overrides it.',
    "max_credits_per_action" = COALESCE("max_credits_per_action", 5000)
WHERE "action" = 'sponsored_task_milestone';
--> statement-breakpoint
UPDATE "reward_rules"
SET "description" = 'Default credits awarded for platform watch-time milestones when watch-time rewards are enabled.',
    "max_credits_per_action" = COALESCE("max_credits_per_action", 5000)
WHERE "action" = 'watch_time_milestone';
--> statement-breakpoint
UPDATE "reward_rules"
SET "description" = 'Maximum credits an admin can add in a single manual credit action. Set to 0 to block manual credits.',
    "min_credits_per_action" = 1,
    "max_credits_per_action" = COALESCE(NULLIF("max_credits_per_action", 0), 100000)
WHERE "action" = 'admin_credit';
--> statement-breakpoint
UPDATE "reward_rules"
SET "description" = 'Maximum credits an admin can deduct or remove in a single adjustment action. Set to 0 to block manual deductions.',
    "min_credits_per_action" = 1,
    "max_credits_per_action" = COALESCE(NULLIF("max_credits_per_action", 0), 100000)
WHERE "action" = 'admin_adjustment';
