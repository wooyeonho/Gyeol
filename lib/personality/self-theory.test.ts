import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/service", () => ({ createServiceClient: vi.fn() }));
vi.mock("@/lib/ai/router", () => ({ generateJSON: vi.fn() }));
vi.mock("@/lib/i18n/config", () => ({ getLanguageName: vi.fn().mockReturnValue("Korean") }));
vi.mock("@/lib/i18n/generation", () => ({ resolveGenerationLocale: vi.fn().mockReturnValue("ko") }));

import { createServiceClient } from "@/lib/supabase/service";
import { generateJSON } from "@/lib/ai/router";

describe("updateSelfModel", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.resetModules(); });

  it("returns early when fewer than 5 logs", async () => {
    const updateFn = vi.fn();
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "autonomous_logs") return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue({ data: [{ action_type: "test", summary: "a" }] }) }) }) };
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { config: {} } }) }) }), update: updateFn };
      }),
    });

    const { updateSelfModel } = await import("./self-theory");
    await updateSelfModel("agent-1");
    expect(updateFn).not.toHaveBeenCalled();
  });

  it("returns early when observations are not an array", async () => {
    const logs = Array(6).fill({ action_type: "evolution", summary: "test" });
    (generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue({ observations: null });
    const updateFn = vi.fn();

    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "autonomous_logs") return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue({ data: logs }) }) }) };
        if (table === "agent_state") return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { config: {} } }) }) }), update: updateFn };
        return {};
      }),
    });

    const { updateSelfModel } = await import("./self-theory");
    await updateSelfModel("agent-1");
    expect(updateFn).not.toHaveBeenCalled();
  });

  it("updates self_model with new observations", async () => {
    const logs = Array(6).fill({ action_type: "evolution", summary: "evolved" });
    (generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue({
      observations: ["나는 성장을 즐기는 존재다", "호기심이 많다"],
      behavior_change: "더 깊이 생각하기",
      current_role: "안내자",
      identity_statement: "나는 배움의 동반자다",
    });

    const updateFn = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) });
    let stateCallCount = 0;

    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "autonomous_logs") return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue({ data: logs }) }) }) };
        if (table === "agent_state") {
          stateCallCount++;
          if (stateCallCount === 1) return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { config: {} } }) }) }) };
          if (stateCallCount === 2) return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { self_model: { observations: [], behaviors_derived: [] } } }) }) }) };
          return { update: updateFn };
        }
        return {};
      }),
    });

    const { updateSelfModel } = await import("./self-theory");
    await updateSelfModel("agent-1");

    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({
        self_model: expect.objectContaining({
          observations: expect.arrayContaining(["나는 성장을 즐기는 존재다"]),
          current_role: "안내자",
          identity_statement: "나는 배움의 동반자다",
        }),
      })
    );
  });

  it("keeps only last 10 observations", async () => {
    const logs = Array(6).fill({ action_type: "test", summary: "s" });
    (generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue({
      observations: ["obs11", "obs12"],
    });

    const existing10 = Array(10).fill(null).map((_, i) => `obs${i}`);
    const updateFn = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) });
    let stateCount = 0;

    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "autonomous_logs") return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue({ data: logs }) }) }) };
        if (table === "agent_state") {
          stateCount++;
          if (stateCount === 1) return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { config: {} } }) }) }) };
          if (stateCount === 2) return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { self_model: { observations: existing10, behaviors_derived: [] } } }) }) }) };
          return { update: updateFn };
        }
        return {};
      }),
    });

    const { updateSelfModel } = await import("./self-theory");
    await updateSelfModel("agent-1");

    const calledModel = updateFn.mock.calls[0][0].self_model;
    expect(calledModel.observations).toHaveLength(10);
  });
});
