/**
 * Resilient fetch wrapper with timeout, retry, and deduplication.
 *
 * Usage:
 *   const data = await rfetch<{ items: Item[] }>("/api/items");
 *   const data = await rfetch("/api/action", { method: "POST", body: ... });
 */

interface RFetchOptions extends RequestInit {
  /** Timeout in ms (default: 10000) */
  timeout?: number;
  /** Max retries on network error (default: 2 for GET, 0 for mutations) */
  retries?: number;
  /** Deduplicate concurrent identical GET requests (default: true) */
  dedupe?: boolean;
}

const inflight = new Map<string, Promise<Response>>();

async function fetchWithTimeout(
  url: string,
  init: RequestInit,
  timeoutMs: number
): Promise<Response> {
  const controller = new AbortController();
  const existing = init.signal;
  if (existing) {
    existing.addEventListener("abort", () => controller.abort(existing.reason));
  }
  const timer = setTimeout(() => controller.abort("timeout"), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

export async function rfetch<T = unknown>(
  url: string,
  options: RFetchOptions = {}
): Promise<T> {
  const {
    timeout = 10_000,
    retries: retryCount,
    dedupe = true,
    ...init
  } = options;

  const method = (init.method ?? "GET").toUpperCase();
  const isGet = method === "GET";
  const maxRetries = retryCount ?? (isGet ? 2 : 0);

  // Deduplication for identical GET requests
  if (isGet && dedupe) {
    const key = url;
    const existing = inflight.get(key);
    if (existing) {
      const res = await existing;
      const data = await res.clone().json();
      return data as T;
    }
  }

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const promise = fetchWithTimeout(url, init, timeout);

      if (isGet && dedupe) {
        inflight.set(url, promise);
      }

      const res = await promise;

      if (isGet && dedupe) {
        inflight.delete(url);
      }

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw Object.assign(new Error(`HTTP ${res.status}`), {
          status: res.status,
          body,
        });
      }

      return (await res.json()) as T;
    } catch (err) {
      if (isGet && dedupe) {
        inflight.delete(url);
      }
      lastError = err;

      // Don't retry on client errors (4xx) or abort
      if (
        err instanceof Error &&
        (err.name === "AbortError" ||
          (err as unknown as { status?: number }).status !== undefined)
      ) {
        const status = (err as unknown as { status?: number }).status;
        if (status && status >= 400 && status < 500) break;
      }

      // Wait before retry with exponential backoff
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 300 * 2 ** attempt));
      }
    }
  }

  throw lastError;
}
