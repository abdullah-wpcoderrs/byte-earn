import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { createUnderConstructionBlockedResponse, createUnderConstructionResponse } from "@/lib/under-construction-response";

const protectedRoutes = ["/feed", "/tasks", "/wallet", "/upload", "/profile", "/posts", "/u", "/leaderboard"];

function getSupabaseUrl() {
  return process.env.NEXT_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
}

function getSupabasePublishableKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

function getSupabaseServiceKey() {
  return process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_SECRET_KEY;
}

function isRoute(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`);
}

function hasSupabaseAuthCookie(request: NextRequest) {
  return request.cookies.getAll().some(({ name }) => /^sb-.+-auth-token(?:\.\d+)?$/.test(name));
}

async function isUnderConstructionEnabled() {
  const supabaseUrl = getSupabaseUrl();
  const serviceKey = getSupabaseServiceKey();

  if (!supabaseUrl || !serviceKey) {
    return false;
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });

  const { data } = await supabase
    .from("platform_settings")
    .select("under_construction")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  return data?.under_construction ?? false;
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });
  const pathname = request.nextUrl.pathname;
  const isProtectedRoute = protectedRoutes.some((route) => isRoute(pathname, route));
  const isAdminRoute = isRoute(pathname, "/admin");
  const isAdminLoginRoute = isRoute(pathname, "/admin-login");
  const underConstructionEnabled = await isUnderConstructionEnabled();
  const touchesAccountFlow =
    pathname === "/" ||
    isRoute(pathname, "/activate") ||
    isRoute(pathname, "/onboarding") ||
    isAdminRoute ||
    isProtectedRoute ||
    isAdminLoginRoute ||
    underConstructionEnabled;

  if (!touchesAccountFlow) {
    return response;
  }

  if (underConstructionEnabled && !isAdminRoute && !isAdminLoginRoute) {
    return request.method === "GET" || request.method === "HEAD"
      ? createUnderConstructionResponse()
      : createUnderConstructionBlockedResponse();
  }

  if (!hasSupabaseAuthCookie(request)) {
    if (isAdminRoute || isProtectedRoute) {
      return isAdminRoute
        ? NextResponse.redirect(new URL("/admin-login?auth=required", request.url))
        : NextResponse.redirect(new URL("/?auth=required", request.url));
    }

    return response;
  }

  const supabaseUrl = getSupabaseUrl();
  const supabasePublishableKey = getSupabasePublishableKey();

  if (!supabaseUrl || !supabasePublishableKey) {
    return response;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabasePublishableKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          response = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (isAdminRoute || isProtectedRoute) {
      return isAdminRoute
        ? NextResponse.redirect(new URL("/admin-login?auth=required", request.url))
        : NextResponse.redirect(new URL("/?auth=required", request.url));
    }

    return response;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile) {
    if (pathname === "/") {
      return response;
    }

    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    redirectUrl.searchParams.set("auth_error", "Profile not found.");
    return NextResponse.redirect(redirectUrl);
  }

  const isAdmin = profile.role === "admin";
  const isSuspended = profile.status === "suspended";

  if (isSuspended && touchesAccountFlow && pathname !== "/") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/";
    redirectUrl.searchParams.set("auth_error", "Account suspended.");
    return NextResponse.redirect(redirectUrl);
  }

  if (isAdmin) {
    if (isAdminLoginRoute) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/admin";
      redirectUrl.search = "";
      return NextResponse.redirect(redirectUrl);
    }

    if (pathname === "/" || isRoute(pathname, "/activate") || isRoute(pathname, "/onboarding")) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/feed";
      redirectUrl.search = "";
      return NextResponse.redirect(redirectUrl);
    }

    return response;
  }

  if (isAdminLoginRoute) {
    return NextResponse.redirect(new URL("/feed?admin=forbidden", request.url));
  }

  if (pathname === "/" && profile.status === "active") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/feed";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  if (isAdminRoute) {
    return NextResponse.redirect(new URL("/feed?admin=forbidden", request.url));
  }

  if (profile.status === "pending_payment" && !isRoute(pathname, "/activate")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/activate";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  if (profile.status === "onboarding" && !isRoute(pathname, "/onboarding") && !isRoute(pathname, "/activate")) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/onboarding";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  return response;
}
