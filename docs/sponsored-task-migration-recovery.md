# Sponsored Task Migration Recovery

Use this if manual SQL execution fails part-way through `0036_sponsored_task_provider_contract.sql` or `0037_adsterra_cpagrip_runtime_contract.sql`.

## What The Error Means

If you see:

```text
ERROR: 42P01: relation "public.sponsored_task_provider_events" does not exist
```

then Postgres reached a statement that creates an index, policy, or runtime rule on `sponsored_task_provider_events` before that table existed. This usually means `0036` did not complete before `0037` was run, or a previous manual execution stopped halfway through.

## Safe Recovery Order

1. Run the table existence check:

```sql
SELECT to_regclass('public.sponsored_task_provider_events') AS provider_events_table;
```

2. If the result is `NULL`, run all of `db/migrations/0036_sponsored_task_provider_contract.sql` again.

3. Run the table existence check again. It should return:

```text
public.sponsored_task_provider_events
```

4. Run `db/migrations/0037_adsterra_cpagrip_runtime_contract.sql`.

## Notes

- Both migrations are intended to be rerunnable.
- `0036` creates the provider event table and the sponsored completion RPC.
- `0037` assumes `0036` exists, but it now guards the provider-event index creation so a partial state fails less aggressively.
- If `ALTER TYPE ... ADD VALUE` complains because `adsterra` already exists, that is safe; the migration handles duplicate enum values.
