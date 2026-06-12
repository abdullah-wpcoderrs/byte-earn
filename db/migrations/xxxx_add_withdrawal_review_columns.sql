ALTER TABLE "withdrawals" 
ADD COLUMN IF NOT EXISTS "reviewed_by" uuid REFERENCES "public"."profiles"("id"),
ADD COLUMN IF NOT EXISTS "reviewed_at" timestamp with time zone,
ADD COLUMN IF NOT EXISTS "review_note" text;
