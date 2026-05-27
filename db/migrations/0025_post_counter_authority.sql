CREATE OR REPLACE FUNCTION "private"."sync_post_engagement_counts"()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  target_post_id uuid := COALESCE(NEW."post_id", OLD."post_id");
BEGIN
  UPDATE "public"."posts"
  SET "likes_count" = (
        SELECT COUNT(*)::integer
        FROM "public"."post_likes"
        WHERE "post_id" = target_post_id
      ),
      "bookmarks_count" = (
        SELECT COUNT(*)::integer
        FROM "public"."post_bookmarks"
        WHERE "post_id" = target_post_id
      ),
      "comments_count" = (
        SELECT COUNT(*)::integer
        FROM "public"."post_comments"
        WHERE "post_id" = target_post_id
      )
  WHERE "id" = target_post_id;

  RETURN COALESCE(NEW, OLD);
END;
$$;
--> statement-breakpoint
CREATE OR REPLACE FUNCTION "private"."increment_post_counter"(
  "target_post_id" uuid,
  "viewer_profile_id" uuid,
  "counter_name" text,
  "counter_delta" integer DEFAULT 1
)
RETURNS TABLE (
  "impressions_count" integer,
  "shares_count" integer,
  "video_watch_seconds_total" integer,
  "video_watch_sessions_count" integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  post_row record;
BEGIN
  SELECT "id", "author_id", "status"
  INTO post_row
  FROM "public"."posts"
  WHERE "id" = "target_post_id"
  FOR UPDATE;

  IF NOT FOUND OR post_row."status" <> 'published' THEN
    RAISE EXCEPTION 'Post is not available.';
  END IF;

  IF post_row."author_id" = "viewer_profile_id" THEN
    RETURN QUERY
    SELECT
      post."impressions_count",
      post."shares_count",
      post."video_watch_seconds_total",
      post."video_watch_sessions_count"
    FROM "public"."posts" AS post
    WHERE post."id" = "target_post_id";
    RETURN;
  END IF;

  IF NOT "private"."can_profile_engage"("viewer_profile_id") THEN
    RAISE EXCEPTION 'Your account cannot interact with posts right now.';
  END IF;

  IF "counter_name" = 'impressions_count' THEN
    UPDATE "public"."posts"
    SET "impressions_count" = "impressions_count" + GREATEST("counter_delta", 1)
    WHERE "id" = "target_post_id";
  ELSIF "counter_name" = 'shares_count' THEN
    UPDATE "public"."posts"
    SET "shares_count" = "shares_count" + GREATEST("counter_delta", 1)
    WHERE "id" = "target_post_id";
  ELSIF "counter_name" = 'video_watch_seconds_total' THEN
    UPDATE "public"."posts"
    SET "video_watch_seconds_total" = "video_watch_seconds_total" + GREATEST("counter_delta", 1)
    WHERE "id" = "target_post_id";
  ELSIF "counter_name" = 'video_watch_sessions_count' THEN
    UPDATE "public"."posts"
    SET "video_watch_sessions_count" = "video_watch_sessions_count" + GREATEST("counter_delta", 1)
    WHERE "id" = "target_post_id";
  ELSE
    RAISE EXCEPTION 'Unsupported counter.';
  END IF;

  RETURN QUERY
  SELECT
    post."impressions_count",
    post."shares_count",
    post."video_watch_seconds_total",
    post."video_watch_sessions_count"
  FROM "public"."posts" AS post
  WHERE post."id" = "target_post_id";
END;
$$;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "private"."increment_post_counter"(uuid, uuid, text, integer) TO authenticated;
--> statement-breakpoint
DROP TRIGGER IF EXISTS "sync_post_likes_count" ON "public"."post_likes";
--> statement-breakpoint
CREATE TRIGGER "sync_post_likes_count"
AFTER INSERT OR DELETE ON "public"."post_likes"
FOR EACH ROW
EXECUTE FUNCTION "private"."sync_post_engagement_counts"();
--> statement-breakpoint
DROP TRIGGER IF EXISTS "sync_post_bookmarks_count" ON "public"."post_bookmarks";
--> statement-breakpoint
CREATE TRIGGER "sync_post_bookmarks_count"
AFTER INSERT OR DELETE ON "public"."post_bookmarks"
FOR EACH ROW
EXECUTE FUNCTION "private"."sync_post_engagement_counts"();
--> statement-breakpoint
DROP TRIGGER IF EXISTS "sync_post_comments_count" ON "public"."post_comments";
--> statement-breakpoint
CREATE TRIGGER "sync_post_comments_count"
AFTER INSERT OR DELETE ON "public"."post_comments"
FOR EACH ROW
EXECUTE FUNCTION "private"."sync_post_engagement_counts"();
--> statement-breakpoint
UPDATE "public"."posts"
SET "likes_count" = likes."count",
    "bookmarks_count" = bookmarks."count",
    "comments_count" = comments."count"
FROM (
  SELECT "id"
  FROM "public"."posts"
) AS base
CROSS JOIN LATERAL (
  SELECT COUNT(*)::integer AS "count"
  FROM "public"."post_likes"
  WHERE "post_id" = base."id"
) AS likes
CROSS JOIN LATERAL (
  SELECT COUNT(*)::integer AS "count"
  FROM "public"."post_bookmarks"
  WHERE "post_id" = base."id"
) AS bookmarks
CROSS JOIN LATERAL (
  SELECT COUNT(*)::integer AS "count"
  FROM "public"."post_comments"
  WHERE "post_id" = base."id"
) AS comments
WHERE "public"."posts"."id" = base."id";
