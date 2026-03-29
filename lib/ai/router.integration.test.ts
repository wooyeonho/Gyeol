import { describe, it, expect, vi, beforeEach } from "vitest";

// vi.mock auto-hoists — safe to declare at top level
vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));

describe("router integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("generateText falls back through models until one succeeds", async () => {
    let callCount = 0;
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockImplementation(async (url: string) => {
      callCount++;
      if (url.includes("groq") && callCount <= 1) {
        throw new Error("Groq timeout");
      }
      if (url.includes("groq")) {
        const stream = new ReadableStream({
          start(ctrl) {
            ctrl.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({ choices: [{ delta: { content: "hello" } }] })}\n\n`));
            ctrl.enqueue(new TextEncoder().encode("data: [DONE]\n\n"));
            ctrl.close();
          },
        });
        return { ok: true, body: stream };
      }
      throw new Error("unexpected URL");
    });

    const { generateText } = await import("./router");
    const stream = await generateText("system", [{ role: "user", content: "hi" }]);

    expect(stream).toBeDefined();
    // 1 call failed before the 2nd succeeded (2-model cascade: scout → llama-3.1-8b)
    expect(callCount).toBeGreaterThanOrEqual(2);
  });

  it("generateJSON retries once after 500ms backoff", async () => {
    let attempt = 0;
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      attempt++;
      if (attempt <= 2) {
        // First pass: all 2 models fail
        throw new Error("model timeout");
      }
      // Second pass: first model succeeds
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { content: '{"key":"value"}' } }],
        }),
      };
    });

    const start = Date.now();
    const { generateJSON } = await import("./router");
    const result = await generateJSON("system", "produce json");
    const elapsed = Date.now() - start;

    expect(result).toEqual({ key: "value" });
    // Verify the 500ms backoff happened
    expect(elapsed).toBeGreaterThanOrEqual(400);
    // Total calls: 2 (first pass) + 1 (second pass success) = 3
    expect(attempt).toBe(3);
  });

  it("generateJSON returns null when all retries fail", async () => {
    (globalThis.fetch as ReturnType<typeof vi.fn>).mockImplementation(async () => {
      throw new Error("always fails");
    });

    const { generateJSON } = await import("./router");
    const result = await generateJSON("system", "produce json");

    expect(result).toBeNull();
  });

  it("generateTextOnce uses Gemini as last fallback", async () => {
    vi.stubEnv("GEMINI_API_KEY", "test-key");
    let geminiCalled = false;

    (globalThis.fetch as ReturnType<typeof vi.fn>).mockImplementation(async (url: string) => {
      if (url.includes("groq") || url.includes("cloudflare")) {
        throw new Error("provider down");
      }
      if (url.includes("generativelanguage.googleapis.com")) {
        geminiCalled = true;
        return {
          ok: true,
          json: async () => ({
            candidates: [{ content: { parts: [{ text: "gemini response" }] } }],
          }),
        };
      }
      throw new Error("unexpected URL");
    });

    const { generateTextOnce } = await import("./router");
    const result = await generateTextOnce("system", "user prompt");

    expect(geminiCalled).toBe(true);
    expect(result).toBe("gemini response");
  });
});
