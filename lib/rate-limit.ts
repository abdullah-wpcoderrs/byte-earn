import "server-only";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { createAdminClient, hasSupabaseAdminKey } from "@/lib/supabase/admin";

type RateLimitEntry = {
  count: number;
  resetAt: number;
};

type RateLimitResult = {
  allowed: boolean;
  remaining: number;
  resetAt: number;
};

const buckets = new Map<string, RateLimitEntry>();

function getSupabaseUrl() {
  return process.env.NEXT_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
}

function getSupabasePublishableKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

function createRateLimitClient() {
  if (hasSupabaseAdminKey()) {
    return createAdminClient();
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("Shared rate limiting requires SUPABASE_SERVICE_ROLE_KEY in production.");
  }

  const supabaseUrl = getSupabaseUrl();
  const supabasePublishableKey = getSupabasePublishableKey();

  if (!supabaseUrl || !supabasePublishableKey) {
    return null;
  }

  return createSupabaseClient(supabaseUrl, supabasePublishableKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function checkRateLimitLocally(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  const entry = buckets.get(key);

  if (!entry || entry.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, resetAt: now + windowMs };
  }

  if (entry.count >= limit) {
    return { allowed: false, remaining: 0, resetAt: entry.resetAt };
  }

  entry.count += 1;
  return { allowed: true, remaining: limit - entry.count, resetAt: entry.resetAt };
}

function shouldUseLocalFallback(message: string) {
  return process.env.NODE_ENV !== "production" && (
    message.includes("consume_rate_limit") ||
    message.includes("rate_limit_buckets") ||
    message.includes("schema cache") ||
    message.includes("does not exist")
  );
}

export function getClientIp(headers: Headers) {
  const forwarded = headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || headers.get("x-real-ip") || "127.0.0.1";
}

export async function checkRateLimit(key: string, limit: number, windowMs: number): Promise<RateLimitResult> {
  const supabase = createRateLimitClient();

  if (!supabase) {
    return checkRateLimitLocally(key, limit, windowMs);
  }

  const { data, error } = await supabase.rpc("consume_rate_limit", {
    bucket_key: key,
    max_attempts: limit,
    window_ms: windowMs,
  });

  if (error) {
    if (shouldUseLocalFallback(error.message)) {
      // Local fallback keeps development unblocked until the SQL function is installed.
      return checkRateLimitLocally(key, limit, windowMs);
    }

    throw new Error(error.message);
  }

  const result = data?.[0];

  if (!result) {
    throw new Error("Rate limit service unavailable.");
  }

  return {
    allowed: Boolean(result.allowed),
    remaining: Number(result.remaining ?? 0),
    resetAt: new Date(result.reset_at).getTime(),
  };
}

export async function assertRateLimit(key: string, limit: number, windowMs: number) {
  const result = await checkRateLimit(key, limit, windowMs);

  if (!result.allowed) {
    throw new Error("Too many requests. Please wait and try again.");
  }

  return result;
}
