import { emitSystemAlert } from "@/lib/ops/alerts";

export async function register() {
  // Can be used to run code on server startup
}

export async function onRequestError(err: Error, request: { url?: string }, context: { routerKind?: string; isAction?: boolean }) {
  try {
    const errorName = err.name || "Error";
    const errorMessage = err.message || String(err);
    const path = request?.url || context?.routerKind || "unknown-path";

    console.error("[Next.js Error]", err);

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
