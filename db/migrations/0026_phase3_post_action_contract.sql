CREATE OR REPLACE FUNCTION "private"."get_post_action_snapshot"(
  "target_post_id" uuid,
  "viewer_profile_id" uuid
)
RETURNS TABLE (
  "liked_by_viewer" boolean,
  "bookmarked_by_viewer" boolean,
  "likes_count" integer,
  "bookmarks_count" integer,
  "comments_count" integer,
  "shares_count" integer,
  "impressions_count" integer,
  "video_watch_seconds_total" integer,
  "video_watch_sessions_count" integer
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  post_row record;
  sql text;
BEGIN
  SELECT *
  INTO post_row
  FROM "public"."posts"
  WHERE "id" = "target_post_id";

  IF NOT FOUND THEN
    RETURN;
  END IF;

  sql := format(
    'SELECT
      EXISTS (
        SELECT 1
        FROM public.post_likes
        WHERE post_id = $1
          AND profile_id = $2
      ) AS liked_by_viewer,
      EXISTS (
        SELECT 1
        FROM public.post_bookmarks
        WHERE post_id = $1
          AND profile_id = $2
      ) AS bookmarked_by_viewer,
      COALESCE(post.likes_count, 0) AS likes_count,
      COALESCE(post.bookmarks_count, 0) AS bookmarks_count,
      COALESCE(post.comments_count, 0) AS comments_count,
      %s AS shares_count,
      %s AS impressions_count,
      %s AS video_watch_seconds_total,
      %s AS video_watch_sessions_count
    FROM public.posts AS post
    WHERE post.id = $1',
    CASE WHEN EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'posts'
        AND column_name = 'shares_count'
    ) THEN 'COALESCE(post.shares_count, 0)' ELSE '0' END,
    CASE WHEN EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'posts'
        AND column_name = 'impressions_count'
    ) THEN 'COALESCE(post.impressions_count, 0)' ELSE '0' END,
    CASE WHEN EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'posts'
        AND column_name = 'video_watch_seconds_total'
    ) THEN 'COALESCE(post.video_watch_seconds_total, 0)' ELSE '0' END,
    CASE WHEN EXISTS (
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND table_name = 'posts'
        AND column_name = 'video_watch_sessions_count'
    ) THEN 'COALESCE(post.video_watch_sessions_count, 0)' ELSE '0' END
  );

  RETURN QUERY EXECUTE sql USING "target_post_id", "viewer_profile_id";
END;
$$;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "private"."get_post_action_snapshot"(uuid, uuid) TO authenticated;
