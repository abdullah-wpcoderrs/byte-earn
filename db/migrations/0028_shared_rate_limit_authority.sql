create table if not exists public.rate_limit_buckets (
  bucket_key text primary key,
  attempts integer not null default 0,
  window_started_at timestamp with time zone not null default timezone('utc'::text, now()),
  reset_at timestamp with time zone not null,
  updated_at timestamp with time zone not null default timezone('utc'::text, now())
);

create index if not exists rate_limit_buckets_reset_at_idx
  on public.rate_limit_buckets (reset_at);

alter table public.rate_limit_buckets enable row level security;

revoke all on public.rate_limit_buckets from anon, authenticated;

create or replace function private.consume_rate_limit(
  p_bucket_key text,
  p_max_attempts integer,
  p_window_ms integer
)
returns table (
  allowed boolean,
  remaining integer,
  reset_at timestamp with time zone
)
language plpgsql
security definer
set search_path = public, private
as $$
declare
  next_reset_at timestamp with time zone;
  stored_attempts integer;
  stored_reset_at timestamp with time zone;
begin
  if p_bucket_key is null or length(trim(p_bucket_key)) = 0 then
    raise exception 'rate_limit_key_required';
  end if;

  if p_max_attempts < 1 then
    raise exception 'rate_limit_max_attempts_invalid';
  end if;

  if p_window_ms < 1 then
    raise exception 'rate_limit_window_invalid';
  end if;

  next_reset_at := now() + make_interval(secs => p_window_ms / 1000.0);

  insert into public.rate_limit_buckets as bucket (
    bucket_key,
    attempts,
    window_started_at,
    reset_at,
    updated_at
  )
  values (
    p_bucket_key,
    1,
    now(),
    next_reset_at,
    now()
  )
  on conflict (bucket_key) do update
    set attempts = case
        when bucket.reset_at <= now() then 1
        when bucket.attempts < p_max_attempts then bucket.attempts + 1
        else bucket.attempts
      end,
      window_started_at = case
        when bucket.reset_at <= now() then now()
        else bucket.window_started_at
      end,
      reset_at = case
        when bucket.reset_at <= now() then next_reset_at
        else bucket.reset_at
      end,
      updated_at = now()
  returning bucket.attempts, bucket.reset_at
    into stored_attempts, stored_reset_at;

  return query
  select
    stored_attempts <= p_max_attempts,
    greatest(p_max_attempts - stored_attempts, 0),
    stored_reset_at;
end;
$$;

revoke all on function private.consume_rate_limit(text, integer, integer) from public;
grant execute on function private.consume_rate_limit(text, integer, integer) to service_role;
