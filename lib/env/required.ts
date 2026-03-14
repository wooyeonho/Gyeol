export class MissingEnvError extends Error {
  readonly code = "MISSING_ENV";
  readonly missing: string[];

  constructor(missing: string[], scope?: string) {
    const label = scope ? ` for ${scope}` : "";
    super(`Missing required environment variables${label}: ${missing.join(", ")}`);
    this.name = "MissingEnvError";
    this.missing = missing;
  }
}

export function missingEnv(required: string[]): string[] {
  return required.filter((key) => {
    const value = process.env[key];
    return typeof value !== "string" || value.trim().length === 0 || value.startsWith("your-");
  });
}

export function hasRequiredEnv(required: string[]): boolean {
  return missingEnv(required).length === 0;
}

export function assertRequiredEnv(required: string[], scope?: string): void {
  const missing = missingEnv(required);
  if (missing.length > 0) {
    throw new MissingEnvError(missing, scope);
  }
}

export function isMissingEnvError(error: unknown): error is MissingEnvError {
  return (
    error instanceof MissingEnvError ||
    (typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: string }).code === "MISSING_ENV")
  );
}
