import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/service", () => ({
  createServiceClient: vi.fn(),
}));

vi.mock("@/lib/ai/router", () => ({
  generateTextOnce: vi.fn(),
}));

import { createServiceClient } from "@/lib/supabase/service";
import { generateTextOnce } from "@/lib/ai/router";

function makeDb(opts: {
  memories?: Array<{ content: string }>;
  sandbox?: Record<string, unknown>;
} = {}) {
  const updateEq = vi.fn().mockResolvedValue({});
  const updateFn = vi.fn().mockReturnValue({ eq: updateEq });

  const from = vi.fn().mockImplementation((table: string) => {
    if (table === "memories") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: opts.memories ?? [],
              }),
            }),
          }),
        }),
      };
    }
    if (table === "agent_state") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: { sandbox: opts.sandbox ?? {} },
            }),
          }),
        }),
        update: updateFn,
      };
    }
    return {};
  });

  return { db: { from }, updateFn };
}

describe("designNewSense", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("skips when no matching patterns found", async () => {
    const { db } = makeDb({ memories: [{ content: "random text about cats" }] });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);

    const { designNewSense } = await import("./sense-design");
    await designNewSense("agent-1");
    expect(generateTextOnce).not.toHaveBeenCalled();
  });

  it("designs weather sense when weather pattern matches", async () => {
    const { db, updateFn } = makeDb({
      memories: [{ content: "I want to check the weather today" }],
      sandbox: {},
    });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);
    (generateTextOnce as ReturnType<typeof vi.fn>).mockResolvedValue("Use OpenWeather API to fetch data");

    const { designNewSense } = await import("./sense-design");
    await designNewSense("agent-1");

    expect(generateTextOnce).toHaveBeenCalledOnce();
    expect(updateFn).toHaveBeenCalled();
  });

  it("skips when skill already installed", async () => {
    const { db } = makeDb({
      memories: [{ content: "I need the weather forecast" }],
      sandbox: { installed_skills: [{ id: "weather", description: "x", created_at: "2026-01-01" }] },
    });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);

    const { designNewSense } = await import("./sense-design");
    await designNewSense("agent-1");
    expect(generateTextOnce).not.toHaveBeenCalled();
  });

  it("detects news pattern", async () => {
    const { db, updateFn } = makeDb({
      memories: [{ content: "I want news updates every day" }],
      sandbox: {},
    });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);
    (generateTextOnce as ReturnType<typeof vi.fn>).mockResolvedValue("RSS feed stub");

    const { designNewSense } = await import("./sense-design");
    await designNewSense("agent-1");
    expect(updateFn).toHaveBeenCalled();
  });
});
