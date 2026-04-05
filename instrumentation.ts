import * as Sentry from "@sentry/nextjs";
import { emitSystemAlert } from "@/lib/ops/alerts";

/**
 * Critical environment variables that MUST be present in production.
 * Missing any of these means the server cannot function safely.
 */
const CRITICAL_ENV_KEYS = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "CRON_SECRET",
] as const;

const RECOMMENDED_ENV_KEYS = [
  "GROQ_API_KEY",
  "GEMINI_API_KEY",
  "CONNECTION_TOKEN_KEY",
  "TELEGRAM_WEBHOOK_SECRET",
  "NEXT_PUBLIC_APP_URL",
  "VAPID_PRIVATE_KEY",
] as const;

function validateEnvironment() {
  const missing = CRITICAL_ENV_KEYS.filter((key) => !process.env[key]);
  const missingRecommended = RECOMMENDED_ENV_KEYS.filter((key) => !process.env[key]);

  if (missingRecommended.length > 0) {
    console.warn(
      `[Gyeol] WARNING: Recommended env vars missing: ${missingRecommended.join(", ")}. Some features may not work.`
    );
  }

  if (missing.length > 0) {
    const message = `[Gyeol] CRITICAL: Required env vars missing: ${missing.join(", ")}. Server cannot operate safely.`;
    if (process.env.NODE_ENV === "production") {
      // In production, throw to prevent the server from starting in a broken state.
      // This ensures webhooks, cron jobs, and auth don't silently run unprotected.
      throw new Error(message);
    }
    console.error(message);
  }
}

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    validateEnvironment();
    await import("./sentry.server.config");
  }
  if (process.env.NEXT_RUNTIME === "edge") {
    await import("./sentry.edge.config");
  }
}

export async function onRequestError(err: Error, request: { url?: string }, context: { routerKind?: string; isAction?: boolean }) {
  try {
    const errorName = err.name || "Error";
    const errorMessage = err.message || String(err);
    const path = request?.url || context?.routerKind || "unknown-path";

    console.error("[Next.js Error]", err);

    Sentry.captureException(err, {
      extra: { path, routerKind: context?.routerKind, isAction: context?.isAction },
    });

    await emitSystemAlert(
      {
        level: "critical",
        source: "instrumentation",
        code: `500_UNHANDLED_ERROR`,
        message: `Unhandled Error: ${errorName} - ${errorMessage}`,
        details: {
          path,
          stack: err.stack,
          routerKind: context?.routerKind,
          isAction: context?.isAction,
        },
      },
      { notifySlack: true, notifyEmail: true }
    );
  } catch (e) {
    console.error("Failed to report unhandled error to system_alerts", e);
  }
}
