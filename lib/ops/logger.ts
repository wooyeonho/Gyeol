type LogLevel = "info" | "warn" | "error";

type LogContext = Record<string, unknown>;

/**
 * Patterns that indicate sensitive data which should be redacted from logs.
 */
const SENSITIVE_PATTERNS = [
  /(?:api[_-]?key|secret|password|token|credential|private[_-]?key|authorization)\s*[=:]\s*\S+/gi,
  /(?:Bearer\s+)\S+/g,
  /(?:sk[_-]live|sk[_-]test|rk[_-]live|rk[_-]test|whsec)[_-]\S+/g, // Stripe keys
  /eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}/g, // JWT tokens
  /[0-9a-f]{64}/gi, // SHA256 hashes (API key hashes)
  /supabase[_-]?(?:service|anon)[_-]?(?:role)?[_-]?key\s*[=:]\s*\S+/gi,
];

function redactSensitive(value: string): string {
  let redacted = value;
  for (const pattern of SENSITIVE_PATTERNS) {
    // Reset lastIndex for global patterns
    pattern.lastIndex = 0;
    redacted = redacted.replace(pattern, (match) => {
      // Keep first 8 chars for debugging, redact the rest
      if (match.length <= 12) return "[REDACTED]";
      return match.slice(0, 8) + "...[REDACTED]";
    });
  }
  return redacted;
}

function sanitizeContext(context: LogContext): LogContext {
  const sanitized: LogContext = {};
  for (const [key, value] of Object.entries(context)) {
    if (typeof value === "string") {
      sanitized[key] = redactSensitive(value);
    } else if (value instanceof Error) {
      sanitized[key] = redactSensitive(value.message);
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

function writeLog(level: LogLevel, message: string, context?: LogContext) {
  const safeMessage = redactSensitive(message);
  const safeContext = context ? sanitizeContext(context) : undefined;

  const payload = {
    ts: new Date().toISOString(),
    level,
    message: safeMessage,
    ...(safeContext ? { context: safeContext } : {}),
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
    safeContext.errorMessage = redactSensitive(error.message);
    if (process.env.NODE_ENV !== "production") {
      safeContext.stack = error.stack ? redactSensitive(error.stack) : undefined;
    }
  }
  writeLog("error", `Route error: ${route}`, safeContext);
}
