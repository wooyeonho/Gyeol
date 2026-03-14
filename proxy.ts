import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { resolveLocale, LOCALE_COOKIE_NAME } from '@/lib/i18n/config';

const PUBLIC_PATHS = ["/login", "/signup", "/auth", "/features", "/plans", "/explore", "/dashboard", "/adopt", "/share", "/invite", "/community", "/privacy", "/terms"];

function isPublicPath(pathname: string): boolean {
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static files, API routes, and Next.js internals for both locales and auth
  if (
    pathname.startsWith("/_next") ||
    pathname.includes(".") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // Resolve locale
  const locale = resolveLocale({
    acceptLanguage: request.headers.get("accept-language"),
    cookieLocale: request.cookies.get(LOCALE_COOKIE_NAME)?.value,
  });

  const response = NextResponse.next({ request: { headers: request.headers } });

  // Add locale cookie if missing or mismatched
  if (!request.cookies.has(LOCALE_COOKIE_NAME) || request.cookies.get(LOCALE_COOKIE_NAME)?.value !== locale) {
    response.cookies.set(LOCALE_COOKIE_NAME, locale, {
      path: "/",
      maxAge: 365 * 24 * 60 * 60, // 1 year
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }

  // Handle Auth
  if (isPublicPath(pathname)) {
    return response;
  }
  
  if (
    pathname.startsWith("/api/cron") ||
    pathname.startsWith("/api/v1") ||
    pathname.startsWith("/api/research") ||
    pathname.startsWith("/api/email/send") ||
    pathname.startsWith("/api/social/global-feed") ||
    pathname.startsWith("/api/home/summary")
  ) {
    return response;
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    if (process.env.NODE_ENV === "production" && !pathname.startsWith("/api")) {
      return new NextResponse("Service unavailable: auth middleware is not configured", { status: 503 });
    }
    return response;
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user && !pathname.startsWith("/api")) {
    const loginUrl = new URL("/login", request.url);
    const nextPath = `${pathname}${request.nextUrl.search}`;
    if (nextPath && nextPath !== "/") {
      loginUrl.searchParams.set("next", nextPath);
    }
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
