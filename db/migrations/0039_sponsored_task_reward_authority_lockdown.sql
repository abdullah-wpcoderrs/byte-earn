-- Lock sponsored-task rewards behind trusted server and database flows.
REVOKE EXECUTE ON FUNCTION "public"."complete_sponsored_task_session"(uuid, text, text, timestamp with time zone) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION "public"."complete_sponsored_task_session"(uuid, text, text, timestamp with time zone) FROM anon;
REVOKE EXECUTE ON FUNCTION "public"."complete_sponsored_task_session"(uuid, text, text, timestamp with time zone) FROM authenticated;
GRANT EXECUTE ON FUNCTION "public"."complete_sponsored_task_session"(uuid, text, text, timestamp with time zone) TO service_role;

-- Users may read their own sessions, but lifecycle writes must go through trusted server actions.
DROP POLICY IF EXISTS "task_sessions_insert_own" ON "public"."task_sessions";
DROP POLICY IF EXISTS "task_sessions_update_own" ON "public"."task_sessions";
