create or replace function public.consume_rate_limit(
  bucket_key text,
  max_attempts integer,
  window_ms integer
)
returns table (
  allowed boolean,
  remaining integer,
  reset_at timestamp with time zone
)
language sql
security definer
set search_path = public, private
as $$
  select *
  from private.consume_rate_limit(
    p_bucket_key => consume_rate_limit.bucket_key,
    p_max_attempts => consume_rate_limit.max_attempts,
    p_window_ms => consume_rate_limit.window_ms
  );
$$;

revoke all on function public.consume_rate_limit(text, integer, integer) from public;
grant execute on function public.consume_rate_limit(text, integer, integer) to authenticated;
grant execute on function public.consume_rate_limit(text, integer, integer) to service_role;
