import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import { resolveLocale, LOCALE_COOKIE_NAME } from "@/lib/i18n/config";

// ══════════════════════════════════════════
// CSRF Protection — Origin header validation
// ══════════════════════════════════════════
const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "DELETE", "PATCH"]);

/**
 * Paths exempt from CSRF origin check (webhooks, cron, external API).
 */
const CSRF_EXEMPT_PREFIXES = [
  "/api/webhook",
  "/api/billing/webhook",
  "/api/cron",
  "/api/v1",
  "/api/email/send",
];

function isCsrfExempt(pathname: string): boolean {
  return CSRF_EXEMPT_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

function checkCsrfOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  const host = request.headers.get("host");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL;

  // Build set of allowed origin hosts
  const allowed = new Set<string>();
  if (host) allowed.add(host);
  if (appUrl) {
    try {
      allowed.add(new URL(appUrl).host);
    } catch { /* ignore invalid URL */ }
  }
  // Vercel preview deployments
  if (host?.endsWith(".vercel.app")) allowed.add(host);

  // Custom override for preview / staging deploys (matches lib/security/csrf.ts)
  const extraOrigins = process.env.CSRF_ALLOWED_ORIGINS;
  if (extraOrigins) {
    for (const o of extraOrigins.split(",")) {
      const trimmed = o.trim();
      if (trimmed) {
        try {
          allowed.add(new URL(trimmed).host);
        } catch {
          // If not a valid URL, treat as a raw host value
          allowed.add(trimmed);
        }
      }
    }
  }

  if (origin) {
    try {
      return allowed.has(new URL(origin).host);
    } catch { return false; }
  }
  if (referer) {
    try {
      return allowed.has(new URL(referer).host);
    } catch { return false; }
  }
  // No Origin or Referer — reject for state-changing requests
  return false;
}

// ══════════════════════════════════════════
// IP-based Rate Limiting (in-memory, per-instance)
// NOTE: This is a first-line burst-protection layer only.
// In multi-instance deployments (Vercel serverless), each instance has its own
// bucket so limits are per-instance, not global. Critical endpoints (chat,
// social, etc.) use DB-backed atomic rate limiting via lib/rate-limit.ts
// for true distributed enforcement.
// ══════════════════════════════════════════
const IP_WINDOW_MS = 60_000; // 1 minute
const IP_MAX_REQUESTS = 100; // per minute per IP for API routes
const IP_MAX_AUTH_REQUESTS = 8; // stricter for auth routes

type RateBucket = { count: number; resetAt: number };
const ipBuckets = new Map<string, RateBucket>();

// Cleanup stale entries every 5 minutes
let lastCleanup = Date.now();
function cleanupBuckets() {
  const now = Date.now();
  if (now - lastCleanup < 300_000) return;
  lastCleanup = now;
  for (const [key, bucket] of ipBuckets) {
    if (bucket.resetAt < now) ipBuckets.delete(key);
  }
}

function checkIpRateLimit(ip: string, pathname: string): boolean {
  cleanupBuckets();
  const now = Date.now();
  const key = `${ip}:${pathname.startsWith("/api/auth") || pathname === "/login" || pathname === "/signup" ? "auth" : "api"}`;
  const limit = key.endsWith("auth") ? IP_MAX_AUTH_REQUESTS : IP_MAX_REQUESTS;

  const bucket = ipBuckets.get(key);
  if (!bucket || bucket.resetAt < now) {
    ipBuckets.set(key, { count: 1, resetAt: now + IP_WINDOW_MS });
    return true;
  }
  bucket.count++;
  return bucket.count <= limit;
}

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
// Next.js Middleware — CSP, CSRF, Rate Limit, Auth
// ══════════════════════════════════════════
export async function middleware(request: NextRequest) {
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

  // ── Security response headers ──
  response.headers.set("Content-Security-Policy", csp);
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy", "camera=(), microphone=(self), geolocation=(), payment=(), interest-cohort=()");
  response.headers.set("X-DNS-Prefetch-Control", "on");

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

  // ── CORS: allow external callers for v1 API ──
  if (pathname.startsWith("/api/v1")) {
    const origin = request.headers.get("origin") ?? "*";
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    response.headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, X-API-Key");
    response.headers.set("Access-Control-Max-Age", "86400");
    if (request.method === "OPTIONS") {
      return new NextResponse(null, {
        status: 204,
        headers: response.headers,
      });
    }
  }

  // ── CSRF: validate Origin for state-changing API requests ──
  if (
    pathname.startsWith("/api") &&
    STATE_CHANGING_METHODS.has(request.method) &&
    !isCsrfExempt(pathname)
  ) {
    if (!checkCsrfOrigin(request)) {
      return NextResponse.json(
        { error: "CSRF validation failed" },
        { status: 403, headers: { "Content-Type": "application/json" } }
      );
    }
  }

  // ── Rate Limit: IP-based for all API routes ──
  if (pathname.startsWith("/api")) {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim()
      ?? request.headers.get("x-real-ip")
      ?? "unknown";
    if (!checkIpRateLimit(ip, pathname)) {
      return NextResponse.json(
        { error: "Too many requests" },
        {
          status: 429,
          headers: {
            "Retry-After": "60",
            "Content-Type": "application/json",
          },
        }
      );
    }
  }

  // ── Auth: skip for public paths and self-authed APIs ──
  if (isPublicPath(pathname) || isSelfAuthedApiPath(pathname)) {
    return response;
  }

  // ── Auth: verify Supabase session ──
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    // Supabase not configured — skip middleware auth gracefully.
    // Individual API routes and pages handle their own auth checks.
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
