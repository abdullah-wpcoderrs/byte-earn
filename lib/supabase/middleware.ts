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

export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({
    request,
  });
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

  const pathname = request.nextUrl.pathname;
  const touchesAccountFlow =
    pathname === "/" ||
    isRoute(pathname, "/activate") ||
    isRoute(pathname, "/onboarding") ||
    isRoute(pathname, "/admin") ||
    protectedRoutes.some((route) => isRoute(pathname, route));
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    if (isRoute(pathname, "/admin") || protectedRoutes.some((route) => isRoute(pathname, route))) {
      const redirectUrl = request.nextUrl.clone();
      redirectUrl.pathname = "/";
      redirectUrl.searchParams.set("auth", "required");
      return NextResponse.redirect(redirectUrl);
    }

    return response;
  }

  if (!touchesAccountFlow) {
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

  if (pathname === "/" && profile.status === "active") {
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname = "/feed";
    redirectUrl.search = "";
    return NextResponse.redirect(redirectUrl);
  }

  if (isRoute(pathname, "/admin")) {
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
