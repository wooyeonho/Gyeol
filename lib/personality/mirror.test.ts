import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/service", () => ({ createServiceClient: vi.fn() }));
vi.mock("@/lib/ai/router", () => ({ generateJSON: vi.fn() }));
vi.mock("@/lib/i18n/config", () => ({ getLanguageName: vi.fn().mockReturnValue("Korean") }));
vi.mock("@/lib/i18n/generation", () => ({ resolveGenerationLocale: vi.fn().mockReturnValue("ko") }));

import { createServiceClient } from "@/lib/supabase/service";
import { generateJSON } from "@/lib/ai/router";

function makeDb(chats: Array<{ role: string; content: string }>, state: Record<string, unknown> | null) {
  const updateFn = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) });
  const insertFn = vi.fn().mockResolvedValue({});
  const from = vi.fn().mockImplementation((table: string) => {
    if (table === "chats") {
      return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue({ data: chats }) }) }) };
    }
    if (table === "agent_state") {
      return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: state }) }) }), update: updateFn };
    }
    if (table === "memories") return { insert: insertFn };
    return {};
  });
  return { db: { from }, updateFn, insertFn };
}

describe("analyzeMirrorEffect", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.resetModules(); });

  it("returns early when fewer than 10 chats", async () => {
    const { db, updateFn } = makeDb(Array(5).fill({ role: "user", content: "hi" }), { fragments: [], config: {} });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);

    const { analyzeMirrorEffect } = await import("./mirror");
    await analyzeMirrorEffect("agent-1");
    expect(updateFn).not.toHaveBeenCalled();
    expect(generateJSON).not.toHaveBeenCalled();
  });

  it("does nothing when mirroring is false", async () => {
    const chats = Array(12).fill({ role: "user", content: "hello" });
    (generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue({ mirroring: false });
    const { db, updateFn } = makeDb(chats, { fragments: [], config: {} });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);

    const { analyzeMirrorEffect } = await import("./mirror");
    await analyzeMirrorEffect("agent-1");
    expect(updateFn).not.toHaveBeenCalled();
  });

  it("adds observation to fragments when mirroring detected", async () => {
    const chats = Array(12).fill({ role: "user", content: "언제나 솔직하게 말해요" });
    (generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue({ mirroring: true, observation: "AI is reflecting user's direct speech style." });
    const { db, updateFn, insertFn } = makeDb(chats, { fragments: ["existing fragment"], config: {} });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);

    const { analyzeMirrorEffect } = await import("./mirror");
    await analyzeMirrorEffect("agent-1");

    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({ fragments: expect.arrayContaining(["AI is reflecting user's direct speech style."]) })
    );
    expect(insertFn).toHaveBeenCalledWith(
      expect.objectContaining({ type: "observation", content: "AI is reflecting user's direct speech style." })
    );
  });

  it("keeps only last 20 fragments", async () => {
    const chats = Array(12).fill({ role: "user", content: "text" });
    (generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue({ mirroring: true, observation: "New observation" });
    const manyFragments = Array(20).fill(null).map((_, i) => `Fragment ${i}`);
    const { db, updateFn } = makeDb(chats, { fragments: manyFragments, config: {} });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);

    const { analyzeMirrorEffect } = await import("./mirror");
    await analyzeMirrorEffect("agent-1");

    const calledFragments = updateFn.mock.calls[0][0].fragments;
    expect(calledFragments).toHaveLength(20);
  });
});
