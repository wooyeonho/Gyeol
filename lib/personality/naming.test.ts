import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/service", () => ({ createServiceClient: vi.fn() }));
vi.mock("@/lib/ai/router", () => ({ generateJSON: vi.fn() }));
vi.mock("@/lib/i18n/config", () => ({ getLanguageName: vi.fn().mockReturnValue("Korean") }));
vi.mock("@/lib/i18n/generation", () => ({ resolveGenerationLocale: vi.fn().mockReturnValue("ko") }));

import { createServiceClient } from "@/lib/supabase/service";
import { generateJSON } from "@/lib/ai/router";

describe("checkSelfNaming", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.resetModules(); });

  it("does nothing if self_name is a real custom name", async () => {
    const updateFn = vi.fn();
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { self_name: "소울", total_messages: 30, config: {} } }) }) }),
        update: updateFn,
      }),
    });

    const { checkSelfNaming } = await import("./naming");
    await checkSelfNaming("agent-1");
    expect(updateFn).not.toHaveBeenCalled();
    expect(generateJSON).not.toHaveBeenCalled();
  });

  it("treats default name 'GYEOL' as unnamed and triggers rename", async () => {
    (generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue({ name: "소울", reason: "It means soul" });
    const updateFn = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) });
    const insertFn = vi.fn().mockResolvedValue({});

    let callCount = 0;
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "agent_state") {
          callCount++;
          if (callCount === 1) return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { self_name: "GYEOL", total_messages: 25, config: {} } }) }) }), update: updateFn };
          return { update: updateFn };
        }
        if (table === "memories") return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue({ data: [{ content: "memory 1" }] }) }) }) };
        if (table === "autonomous_logs") return { insert: insertFn };
        return {};
      }),
    });

    const { checkSelfNaming } = await import("./naming");
    await checkSelfNaming("agent-1");
    expect(updateFn).toHaveBeenCalledWith({ self_name: "소울" });
  });

  it("does nothing if total_messages < 5", async () => {
    const updateFn = vi.fn();
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { self_name: null, total_messages: 3, config: {} } }) }) }),
        update: updateFn,
      }),
    });

    const { checkSelfNaming } = await import("./naming");
    await checkSelfNaming("agent-1");
    expect(updateFn).not.toHaveBeenCalled();
  });

  it("sets self_name when conditions met and AI returns name", async () => {
    (generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue({ name: "소울", reason: "It means soul" });
    const updateFn = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) });
    const insertFn = vi.fn().mockResolvedValue({});

    let callCount = 0;
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "agent_state") {
          callCount++;
          if (callCount === 1) return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { self_name: null, total_messages: 25, config: {} } }) }) }), update: updateFn };
          return { update: updateFn };
        }
        if (table === "memories") return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue({ data: [{ content: "memory 1" }] }) }) }) };
        if (table === "autonomous_logs") return { insert: insertFn };
        return {};
      }),
    });

    const { checkSelfNaming } = await import("./naming");
    await checkSelfNaming("agent-1");

    expect(updateFn).toHaveBeenCalledWith({ self_name: "소울" });
    expect(insertFn).toHaveBeenCalledWith(expect.objectContaining({ action_type: "self_naming" }));
  });

  it("does nothing when AI returns no name", async () => {
    (generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue({ name: null });
    const updateFn = vi.fn();

    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "agent_state") return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { self_name: null, total_messages: 25, config: {} } }) }) }), update: updateFn };
        if (table === "memories") return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue({ data: [] }) }) }) };
        if (table === "autonomous_logs") return { insert: vi.fn() };
        return {};
      }),
    });

    const { checkSelfNaming } = await import("./naming");
    await checkSelfNaming("agent-1");
    expect(updateFn).not.toHaveBeenCalled();
  });
});
