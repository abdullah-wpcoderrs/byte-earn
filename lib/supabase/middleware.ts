import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

const protectedRoutes = ["/feed", "/tasks", "/wallet", "/upload", "/profile", "/posts", "/u", "/leaderboard"];

function getSupabaseUrl() {
  return process.env.NEXT_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
}

function getSupabasePublishableKey() {
  return process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
}

function isRoute(pathname: string, route: string) {
  return pathname === route || pathname.startsWith(`${route}/`);
}

function hasSupabaseAuthCookie(request: NextRequest) {
  return request.cookies.getAll().some(({ name }) => /^sb-.+-auth-token(?:\.\d+)?$/.test(name));
}

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });
  const pathname = request.nextUrl.pathname;
  const isProtectedRoute = protectedRoutes.some((route) => isRoute(pathname, route));
  const isAdminRoute = isRoute(pathname, "/admin");
  const touchesAccountFlow =
    pathname === "/" ||
    isRoute(pathname, "/activate") ||
    isRoute(pathname, "/onboarding") ||
    isAdminRoute ||
    isProtectedRoute;

  if (!touchesAccountFlow) {
    return response;
  }

  if (!hasSupabaseAuthCookie(request)) {
    if (isAdminRoute || isProtectedRoute) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/";
      redirectUrl.searchParams.set("auth", "required");
      return NextResponse.redirect(redirectUrl);
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
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/";
      redirectUrl.searchParams.set("auth", "required");
      return NextResponse.redirect(redirectUrl);
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
    if (pathname === "/" || isRoute(pathname, "/activate") || isRoute(pathname, "/onboarding")) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/admin";
      redirectUrl.search = "";
      return NextResponse.redirect(redirectUrl);
    }

    return response;
  }

  const { data: platformSettings } = await supabase
    .from("platform_settings")
    .select("under_construction")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (
    platformSettings?.under_construction &&
    isProtectedRoute &&
    !isRoute(pathname, "/under-construction")
  ) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/under-construction";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  if (pathname === "/" && profile.status === "active") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/feed";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  if (isAdminRoute) {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/feed";
    redirectUrl.searchParams.set("admin", "forbidden");
    return NextResponse.redirect(redirectUrl);
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
