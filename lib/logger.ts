type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  level: LogLevel;
  timestamp: string;
  requestId?: string;
  message: string;
  [key: string]: unknown;
}

class StructuredLogger {
  private baseContext: Record<string, unknown>;

  constructor(baseContext: Record<string, unknown> = {}) {
    this.baseContext = baseContext;
  }

  public child(context: Record<string, unknown>): StructuredLogger {
    return new StructuredLogger({ ...this.baseContext, ...context });
  }

  private write(level: LogLevel, message: string, meta: Record<string, unknown> = {}) {
    const entry: LogEntry = {
      level,
      timestamp: new Date().toISOString(),
      message,
      ...this.baseContext,
      ...meta,
    };

    const output = JSON.stringify(entry);

    if (process.env.NODE_ENV === 'test') {
      return;
    }

    switch (level) {
      case 'debug':
        console.debug(output);
        break;
      case 'info':
        console.info(output);
        break;
      case 'warn':
        console.warn(output);
        break;
      case 'error':
        console.error(output);
        break;
    }
  }

  public debug(message: string, meta?: Record<string, unknown>) {
    this.write('debug', message, meta);
  }

  public info(message: string, meta?: Record<string, unknown>) {
    this.write('info', message, meta);
  }

  public warn(message: string, meta?: Record<string, unknown>) {
    this.write('warn', message, meta);
  }

  public error(message: string, meta?: Record<string, unknown> | Error) {
    if (meta instanceof Error) {
      this.write('error', message, { error_name: meta.name, error_message: meta.message, stack: meta.stack });
    } else {
      this.write('error', message, meta);
    }
  }
}

export const logger = new StructuredLogger({ source: 'gyeol_app' });
