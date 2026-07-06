-- Adds the 'suspicious' status to the task_session_status enum.
-- schema.ts declares it, server code references it, but the live enum
-- was still at ('pending', 'completed', 'rejected').
-- Run this manually if drizzle-kit does not apply it.

DO $$ BEGIN
  ALTER TYPE "public"."task_session_status" ADD VALUE IF NOT EXISTS 'suspicious';
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
