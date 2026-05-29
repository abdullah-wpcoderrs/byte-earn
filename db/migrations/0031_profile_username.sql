ALTER TABLE "profiles"
ADD COLUMN IF NOT EXISTS "username" text;

CREATE UNIQUE INDEX IF NOT EXISTS "profiles_username_unique"
ON "profiles" (lower("username"))
WHERE "username" IS NOT NULL;

ALTER TABLE "profiles"
DROP CONSTRAINT IF EXISTS "profiles_username_format";

ALTER TABLE "profiles"
ADD CONSTRAINT "profiles_username_format"
CHECK (
  "username" IS NULL
  OR "username" ~ '^[a-z0-9_]{3,24}$'
);
