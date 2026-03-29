import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { resolveLocale, LOCALE_COOKIE_NAME } from "@/lib/i18n/config";

// ══════════════════════════════════════════
// Public paths that don't require authentication
// ══════════════════════════════════════════
const PUBLIC_PATHS = [
  "/login",
  "/signup",
  "/auth",
  "/features",
  "/plans",
  "/explore",
  "/dashboard",
  "/adopt",
  "/share",
  "/invite",
  "/community",
  "/privacy",
  "/terms",
  "/landing",
  "/demo",
  "/offline",
];

function isPublicPath(pathname: string): boolean {
  if (pathname === "/") return false; // Home requires auth
  return PUBLIC_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

// ══════════════════════════════════════════
// API paths with their own auth (cron, v1, webhooks, etc.)
// ══════════════════════════════════════════
function isSelfAuthedApiPath(pathname: string): boolean {
  const selfAuthedPrefixes = [
    "/api/cron",
    "/api/v1",
    "/api/research",
    "/api/email/send",
    "/api/social/global-feed",
    "/api/home/summary",
    "/api/webhook",
    "/api/billing/webhook",
    "/api/demo",
    "/api/og",
    "/api/share",
    "/api/ops/readiness",
  ];
  return selfAuthedPrefixes.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

// ══════════════════════════════════════════
// CSP nonce generation + connect-src whitelist
// ══════════════════════════════════════════
function generateNonce(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
}

function buildCsp(nonce: string): string {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";

  const connectSources = [
    "'self'",
    supabaseUrl,
    supabaseUrl.replace("https://", "wss://"),
    "https://api.groq.com",
    "https://generativelanguage.googleapis.com",
    "https://api.cloudflare.com",
    "https://api.stripe.com",
    "https://js.stripe.com",
    appUrl,
  ].filter(Boolean);

  return [
    "default-src 'self'",
    "base-uri 'self'",
    "frame-ancestors 'none'",
    "object-src 'none'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    `style-src 'self' 'nonce-${nonce}' https://cdn.jsdelivr.net`,
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: https://cdn.jsdelivr.net",
    "worker-src 'self' blob:",
    `connect-src ${connectSources.join(" ")}`,
    "media-src 'self' data: blob:",
    "form-action 'self'",
    "upgrade-insecure-requests",
  ].join("; ");
}

// ══════════════════════════════════════════
// Main proxy (migrated from middleware.ts for Next.js 16 compat)
// ══════════════════════════════════════════
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip static files and Next.js internals
  if (
    pathname.startsWith("/_next") ||
    pathname.includes(".") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // ── Generate CSP nonce ──
  const nonce = generateNonce();
  const csp = buildCsp(nonce);

  // ── Resolve locale ──
  const locale = resolveLocale({
    acceptLanguage: request.headers.get("accept-language"),
    cookieLocale: request.cookies.get(LOCALE_COOKIE_NAME)?.value,
  });

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("x-csp", csp);

  const response = NextResponse.next({
    request: { headers: requestHeaders },
  });

  // Set CSP header
  response.headers.set("Content-Security-Policy", csp);

  // Set locale cookie if missing or mismatched
  if (
    !request.cookies.has(LOCALE_COOKIE_NAME) ||
    request.cookies.get(LOCALE_COOKIE_NAME)?.value !== locale
  ) {
    response.cookies.set(LOCALE_COOKIE_NAME, locale, {
      path: "/",
      maxAge: 365 * 24 * 60 * 60,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }

  // ── Auth: skip for public paths and self-authed APIs ──
  if (isPublicPath(pathname) || isSelfAuthedApiPath(pathname)) {
    return response;
  }

  // ── Auth: verify Supabase session ──
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
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
