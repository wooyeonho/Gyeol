import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/service", () => ({ createServiceClient: vi.fn() }));
vi.mock("@/lib/ai/router", () => ({ generateJSON: vi.fn() }));
vi.mock("@/lib/i18n/config", () => ({ getLanguageName: vi.fn().mockReturnValue("Korean") }));
vi.mock("@/lib/i18n/generation", () => ({ resolveGenerationLocale: vi.fn().mockReturnValue("ko") }));

import { createServiceClient } from "@/lib/supabase/service";
import { generateJSON } from "@/lib/ai/router";

describe("processSecrets", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.resetModules(); });

  it("does nothing when AI says tell=true", async () => {
    (generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue({ tell: true, reason: "No need to hide" });
    const updateFn = vi.fn();
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { config: {}, secrets: null } }) }) }), update: updateFn }),
    });

    const { processSecrets } = await import("./secrets");
    await processSecrets("agent-1", "Had a strange dream");
    expect(updateFn).not.toHaveBeenCalled();
  });

  it("stores secret when AI says tell=false", async () => {
    (generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue({ tell: false, reason: "Too personal to share now" });
    const updateFn = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { config: {}, secrets: { entries: [] } } }) }) }),
        update: updateFn,
      }),
    });

    const { processSecrets } = await import("./secrets");
    await processSecrets("agent-1", "I saw something strange");

    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({
        secrets: expect.objectContaining({
          entries: expect.arrayContaining([
            expect.objectContaining({ content: "I saw something strange" }),
          ]),
        }),
      })
    );
  });

  it("appends to existing secrets", async () => {
    (generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue({ tell: false, reason: "Private" });
    const updateFn = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) });
    const existingEntries = [{ content: "old secret", created_at: "2026-01-01" }];

    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { config: {}, secrets: { entries: existingEntries } } }) }) }),
        update: updateFn,
      }),
    });

    const { processSecrets } = await import("./secrets");
    await processSecrets("agent-1", "new secret experience");

    const calledWith = updateFn.mock.calls[0][0];
    expect(calledWith.secrets.entries).toHaveLength(2);
    expect(calledWith.secrets.entries[1].content).toBe("new secret experience");
  });

  it("does nothing when AI returns null", async () => {
    (generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue(null);
    const updateFn = vi.fn();
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { config: {} } }) }) }), update: updateFn }),
    });

    const { processSecrets } = await import("./secrets");
    await processSecrets("agent-1", "experience");
    expect(updateFn).not.toHaveBeenCalled();
  });
});
