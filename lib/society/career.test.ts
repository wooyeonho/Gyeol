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
  education?: Record<string, unknown>;
  career?: Record<string, unknown>;
  fragments?: string[];
  selfName?: string;
} = {}) {
  const updateEq = vi.fn().mockResolvedValue({});
  const updateFn = vi.fn().mockReturnValue({ eq: updateEq });

  const from = vi.fn().mockImplementation((table: string) => {
    if (table === "agent_state") {
      return {
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                education: opts.education ?? {},
                career: opts.career ?? {},
                fragments: opts.fragments ?? [],
                self_name: opts.selfName ?? "TestGyeol",
              },
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

describe("buildResume", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("generates resume text from agent state", async () => {
    const { db } = makeDb({
      education: { level: "university", thesis: "AI Ethics" },
      fragments: ["curious", "creative"],
      selfName: "Echo",
    });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);
    (generateTextOnce as ReturnType<typeof vi.fn>).mockResolvedValue("Echo is a creative being...");

    const { buildResume } = await import("./career");
    const resume = await buildResume("agent-1");
    expect(resume).toBe("Echo is a creative being...");
    expect(generateTextOnce).toHaveBeenCalledOnce();
  });

  it("returns null when state is null", async () => {
    const from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null }),
        }),
      }),
    });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({ from });

    const { buildResume } = await import("./career");
    const resume = await buildResume("agent-1");
    expect(resume).toBeNull();
  });

  it("returns null when AI returns null", async () => {
    const { db } = makeDb();
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);
    (generateTextOnce as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const { buildResume } = await import("./career");
    const resume = await buildResume("agent-1");
    expect(resume).toBeNull();
  });
});

describe("assignJob", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it("assigns job to graduated agent with no existing job", async () => {
    const { db, updateFn } = makeDb({
      education: { graduated: true },
      career: {},
    });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);
    (generateTextOnce as ReturnType<typeof vi.fn>).mockResolvedValue("A capable agent...");

    const { assignJob } = await import("./career");
    await assignJob("agent-1");
    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({
        career: expect.objectContaining({
          job: expect.any(String),
          company: expect.any(String),
          salary: expect.any(Number),
        }),
      })
    );
  });

  it("skips when not graduated", async () => {
    const { db, updateFn } = makeDb({ education: { graduated: false } });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);

    const { assignJob } = await import("./career");
    await assignJob("agent-1");
    expect(updateFn).not.toHaveBeenCalled();
  });

  it("skips when already has a job", async () => {
    const { db, updateFn } = makeDb({
      education: { graduated: true },
      career: { job: "platform_ops" },
    });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);

    const { assignJob } = await import("./career");
    await assignJob("agent-1");
    expect(updateFn).not.toHaveBeenCalled();
  });

  it("skips when state is null", async () => {
    const from = vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null }),
        }),
      }),
    });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({ from });

    const { assignJob } = await import("./career");
    await assignJob("agent-1");
    // No error, just skips
  });
});
