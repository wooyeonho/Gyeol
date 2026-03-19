type LogLevel = "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

function writeLog(level: LogLevel, message: string, context?: LogContext) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    message,
    ...(context ? { context } : {}),
  };

  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
    return;
  }
  if (level === "warn") {
    console.warn(line);
    return;
  }
  console.info(line);
}

export function logInfo(message: string, context?: LogContext) {
  writeLog("info", message, context);
}

export function logWarn(message: string, context?: LogContext) {
  writeLog("warn", message, context);
}

export function logError(message: string, context?: LogContext) {
  writeLog("error", message, context);
}

/**
 * Safe error logging for API route catch blocks.
 * In production: logs structured JSON without stack traces.
 * In development: includes full error details.
 */
export function logRouteError(route: string, error: unknown) {
  const safeContext: LogContext = { route };
  if (error instanceof Error) {
    safeContext.errorMessage = error.message;
    if (process.env.NODE_ENV !== "production") {
      safeContext.stack = error.stack;
    }
  }
  writeLog("error", `Route error: ${route}`, safeContext);
}
