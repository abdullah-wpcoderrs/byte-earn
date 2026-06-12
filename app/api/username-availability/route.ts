import { NextResponse } from "next/server";
import { createAdminClient, hasSupabaseAdminKey } from "@/lib/supabase/admin";
import { validateUsername } from "@/lib/profile-validation";

function usernameResponse(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

export async function GET(request: Request) {
  const username = new URL(request.url).searchParams.get("username") ?? "";
  const validation = validateUsername(username);

  if (!validation.ok) {
    return usernameResponse({
      available: false,
      message:
        validation.code === "reserved_username"
          ? "This username is reserved and cannot be used."
          : "Username must be 3-24 lowercase letters, numbers, or underscores.",
      reason: validation.code,
    });
  }

  if (!hasSupabaseAdminKey()) {
    return usernameResponse(
      {
        available: false,
        message: "Username checks are temporarily unavailable.",
        reason: "service_unavailable",
      },
      503,
    );
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.from("profiles").select("id").eq("username", validation.value).maybeSingle();

  if (error) {
    return usernameResponse(
      {
        available: false,
        message: "We could not verify username availability right now.",
        reason: "lookup_failed",
      },
      500,
    );
  }

  if (data) {
    return usernameResponse({
      available: false,
      message: "This username is already taken.",
      reason: "username_taken",
    });
  }

  return usernameResponse({
    available: true,
    normalized: validation.value,
    reason: "available",
  });
}
