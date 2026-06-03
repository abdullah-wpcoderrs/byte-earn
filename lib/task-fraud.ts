import "server-only";

type QueryResult = {
  data?: { profile_id: string }[] | null;
  error?: { message: string } | null;
};

type QueryChain = PromiseLike<QueryResult> & {
  eq: (column: string, value: unknown) => QueryChain;
  gte: (column: string, value: unknown) => QueryChain;
  in: (column: string, values: unknown[]) => QueryChain;
  neq: (column: string, value: unknown) => QueryChain;
};

type TableBuilder = {
  select: (columns: string) => QueryChain;
  update: (values: Record<string, unknown>) => QueryChain;
};

type SupabaseLike = {
  from: (table: string) => unknown;
};

function table(supabase: SupabaseLike, tableName: string) {
  return supabase.from(tableName) as TableBuilder;
}

type FraudSession = {
  id: string;
  task_id: string;
  profile_id: string;
  ip_address?: string | null;
  country_code?: string | null;
  provider?: string | null;
};

export type TaskRiskResult = {
  allowed: boolean;
  reason?: string;
  metadata?: Record<string, unknown>;
};

type ProviderCompletionMetadata = {
  conversionIp?: string | null;
  conversionCountry?: string | null;
};

function normalizeCountry(value?: string | null) {
  return value?.trim().toUpperCase() || null;
}

function ipv4Block(ip: string) {
  const parts = ip.split(".");
  if (parts.length !== 4 || parts.some((part) => !/^\d{1,3}$/.test(part))) return null;
  const nums = parts.map(Number);
  if (nums.some((part) => part < 0 || part > 255)) return null;
  return nums.slice(0, 3).join(".");
}

function ipv6Block(ip: string) {
  if (!ip.includes(":")) return null;
  return ip.toLowerCase().split(":").slice(0, 3).join(":");
}

function ipBlock(ip?: string | null) {
  if (!ip) return null;
  return ipv4Block(ip) ?? ipv6Block(ip);
}

function evaluateProviderGeoRisk(session: FraudSession, completion?: ProviderCompletionMetadata): TaskRiskResult {
  const startCountry = normalizeCountry(session.country_code);
  const conversionCountry = normalizeCountry(completion?.conversionCountry);
  if (startCountry && conversionCountry && startCountry !== conversionCountry) {
    return {
      allowed: false,
      reason: "provider_country_mismatch",
      metadata: { startCountry, conversionCountry },
    };
  }

  const startIpBlock = ipBlock(session.ip_address);
  const conversionIpBlock = ipBlock(completion?.conversionIp);
  if (startIpBlock && conversionIpBlock && startIpBlock !== conversionIpBlock && (!startCountry || !conversionCountry || startCountry === conversionCountry)) {
    return {
      allowed: false,
      reason: "provider_ip_block_mismatch",
      metadata: {
        startIpBlock,
        conversionIpBlock,
        startCountry,
        conversionCountry,
      },
    };
  }

  return { allowed: true };
}

export async function evaluateProviderSessionRisk(supabase: SupabaseLike, session: FraudSession, completion?: ProviderCompletionMetadata): Promise<TaskRiskResult> {
  const geoRisk = evaluateProviderGeoRisk(session, completion);
  if (!geoRisk.allowed) return geoRisk;

  if (!session.ip_address) return { allowed: true };

  const since = new Date(Date.now() - 60 * 60 * 1000).toISOString();
  const { data, error } = await table(supabase, "task_sessions")
    .select("id, profile_id, status")
    .eq("task_id", session.task_id)
    .eq("ip_address", session.ip_address)
    .gte("created_at", since)
    .in("status", ["pending", "completed", "suspicious"]);

  if (error) {
    return { allowed: false, reason: "risk_check_failed", metadata: { error: error.message } };
  }

  const sessions = data ?? [];
  const distinctProfiles = new Set(sessions.map((row: { profile_id: string }) => row.profile_id));
  if (distinctProfiles.size >= 5 || sessions.length >= 8) {
    return {
      allowed: false,
      reason: "same_ip_velocity",
      metadata: {
        distinctProfiles: distinctProfiles.size,
        ipSessionCount: sessions.length,
        windowMinutes: 60,
      },
    };
  }

  return { allowed: true };
}

export async function markTaskSessionSuspicious(supabase: SupabaseLike, sessionId: string, reason: string, metadata?: Record<string, unknown>) {
  await table(supabase, "task_sessions")
    .update({
      status: "suspicious",
      fraud_reason: reason,
      fraud_metadata: metadata ? JSON.stringify(metadata) : null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
    .eq("status", "pending");

  await table(supabase, "sponsored_task_provider_events")
    .update({ status: "suspicious" })
    .eq("session_id", sessionId)
    .neq("status", "rewarded");
}
