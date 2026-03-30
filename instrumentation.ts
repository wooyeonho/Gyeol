import * as Sentry from "@sentry/nextjs";
import { emitSystemAlert } from "@/lib/ops/alerts";

export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
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
