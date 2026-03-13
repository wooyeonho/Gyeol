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
