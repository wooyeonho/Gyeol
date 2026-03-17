import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/service", () => ({ createServiceClient: vi.fn() }));
vi.mock("@/lib/ai/router", () => ({ generateJSON: vi.fn() }));

import { createServiceClient } from "@/lib/supabase/service";
import { generateJSON } from "@/lib/ai/router";

describe("tryDeclareRole", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.resetModules(); });

  it("returns early when state not found", async () => {
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null }) }) }) }),
    });

    const { tryDeclareRole } = await import("./role-declare");
    await tryDeclareRole("agent-1");
    expect(generateJSON).not.toHaveBeenCalled();
  });

  it("returns early when role already set", async () => {
    const updateFn = vi.fn();
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { role: "guardian", fragments: [], self_name: "Gyeol" } }) }) }),
        update: updateFn,
      }),
    });

    const { tryDeclareRole } = await import("./role-declare");
    await tryDeclareRole("agent-1");
    expect(updateFn).not.toHaveBeenCalled();
  });

  it("sets role when not set and AI returns a valid role", async () => {
    (generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue({ role: "companion" });
    const updateFn = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) });
    const insertFn = vi.fn().mockResolvedValue({});

    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "agent_state") return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { role: null, fragments: ["I care deeply"], self_name: "Soul" } }) }) }), update: updateFn };
        if (table === "autonomous_logs") return { insert: insertFn };
        return {};
      }),
    });

    const { tryDeclareRole } = await import("./role-declare");
    await tryDeclareRole("agent-1");

    expect(updateFn).toHaveBeenCalledWith({ role: "companion" });
    expect(insertFn).toHaveBeenCalledWith(expect.objectContaining({ action_type: "role_declaration" }));
  });

  it("does nothing when AI returns no role", async () => {
    (generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue({ role: null });
    const updateFn = vi.fn();
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "agent_state") return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { role: null, fragments: [], self_name: "X" } }) }) }), update: updateFn };
        return { insert: vi.fn() };
      }),
    });

    const { tryDeclareRole } = await import("./role-declare");
    await tryDeclareRole("agent-1");
    expect(updateFn).not.toHaveBeenCalled();
  });
});
