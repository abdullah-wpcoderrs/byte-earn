create or replace function public.increment_post_counter(
  target_post_id uuid,
  viewer_profile_id uuid,
  counter_name text,
  counter_delta integer default 1
)
returns table (
  impressions_count integer,
  shares_count integer,
  video_watch_seconds_total integer,
  video_watch_sessions_count integer
)
language sql
security definer
set search_path = public, private
as $$
  select *
  from private.increment_post_counter(
    target_post_id,
    viewer_profile_id,
    counter_name,
    counter_delta
  );
$$;

revoke all on function public.increment_post_counter(uuid, uuid, text, integer) from public;
grant execute on function public.increment_post_counter(uuid, uuid, text, integer) to authenticated;
grant execute on function public.increment_post_counter(uuid, uuid, text, integer) to service_role;

create or replace function public.get_post_action_snapshot(
  target_post_id uuid,
  viewer_profile_id uuid
)
returns table (
  liked_by_viewer boolean,
  bookmarked_by_viewer boolean,
  likes_count integer,
  bookmarks_count integer,
  comments_count integer,
  shares_count integer,
  impressions_count integer,
  video_watch_seconds_total integer,
  video_watch_sessions_count integer
)
language sql
security definer
set search_path = public, private
as $$
  select *
  from private.get_post_action_snapshot(
    target_post_id,
    viewer_profile_id
  );
$$;

revoke all on function public.get_post_action_snapshot(uuid, uuid) from public;
grant execute on function public.get_post_action_snapshot(uuid, uuid) to authenticated;
grant execute on function public.get_post_action_snapshot(uuid, uuid) to service_role;
