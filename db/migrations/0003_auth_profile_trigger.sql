DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'profiles_id_auth_users_id_fk'
  ) THEN
    ALTER TABLE "public"."profiles"
      ADD CONSTRAINT "profiles_id_auth_users_id_fk"
      FOREIGN KEY ("id")
      REFERENCES "auth"."users"("id")
      ON DELETE CASCADE;
  END IF;
END $$;
--> statement-breakpoint
CREATE SCHEMA IF NOT EXISTS "private";
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "private"."handle_new_auth_user"()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  INSERT INTO "public"."profiles" (
    "id",
    "display_name",
    "referral_code",
    "status"
  )
  VALUES (
    NEW."id",
    COALESCE(NEW."raw_user_meta_data" ->> 'display_name', NEW."email"),
    'BE' || UPPER(SUBSTRING(REPLACE(NEW."id"::text, '-', ''), 1, 12)),
    'pending_payment'
  )
  ON CONFLICT ("id") DO NOTHING;

  RETURN NEW;
END;
$$;
--> statement-breakpoint
DROP TRIGGER IF EXISTS "on_auth_user_created_create_profile" ON "auth"."users";
--> statement-breakpoint
CREATE TRIGGER "on_auth_user_created_create_profile"
AFTER INSERT ON "auth"."users"
FOR EACH ROW
EXECUTE FUNCTION "private"."handle_new_auth_user"();
