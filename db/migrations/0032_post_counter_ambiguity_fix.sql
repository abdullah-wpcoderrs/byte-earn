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
    UPDATE "public"."posts" AS post
    SET "impressions_count" = post."impressions_count" + GREATEST("counter_delta", 1)
    WHERE post."id" = "target_post_id";
  ELSIF "counter_name" = 'shares_count' THEN
    UPDATE "public"."posts" AS post
    SET "shares_count" = post."shares_count" + GREATEST("counter_delta", 1)
    WHERE post."id" = "target_post_id";
  ELSIF "counter_name" = 'video_watch_seconds_total' THEN
    UPDATE "public"."posts" AS post
    SET "video_watch_seconds_total" = post."video_watch_seconds_total" + GREATEST("counter_delta", 1)
    WHERE post."id" = "target_post_id";
  ELSIF "counter_name" = 'video_watch_sessions_count' THEN
    UPDATE "public"."posts" AS post
    SET "video_watch_sessions_count" = post."video_watch_sessions_count" + GREATEST("counter_delta", 1)
    WHERE post."id" = "target_post_id";
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
