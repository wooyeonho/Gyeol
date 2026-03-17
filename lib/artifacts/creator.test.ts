import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/service", () => ({ createServiceClient: vi.fn() }));
vi.mock("@/lib/ai/router", () => ({ generateJSON: vi.fn() }));
vi.mock("@/lib/i18n/config", () => ({ getLanguageName: vi.fn().mockReturnValue("Korean") }));
vi.mock("@/lib/i18n/generation", () => ({ resolveGenerationLocale: vi.fn().mockReturnValue("ko") }));

import { createServiceClient } from "@/lib/supabase/service";
import { generateJSON } from "@/lib/ai/router";

function makeDb(state: Record<string, unknown> | null) {
  const insertFn = vi.fn().mockResolvedValue({});
  const from = vi.fn().mockImplementation((table: string) => {
    if (table === "agent_state") {
      return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: state }) }) }) };
    }
    if (table === "memories") {
      return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnThis(), order: vi.fn().mockReturnValue({ limit: vi.fn().mockResolvedValue({ data: [{ content: "A memory about learning" }] }) }) }) };
    }
    if (table === "artifacts" || table === "autonomous_logs") {
      return { insert: insertFn };
    }
    return {};
  });
  return { db: { from }, insertFn };
}

describe("generateArtifact", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.resetModules(); });

  it("returns early when state not found", async () => {
    const { db, insertFn } = makeDb(null);
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);

    const { generateArtifact } = await import("./creator");
    await generateArtifact("agent-1");
    expect(insertFn).not.toHaveBeenCalled();
  });

  it("does nothing when generateJSON returns no content", async () => {
    (generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue({ title: "A title", content: null });
    const { db, insertFn } = makeDb({ self_name: "Soul", mood: "neutral", config: {} });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);

    const { generateArtifact } = await import("./creator");
    await generateArtifact("agent-1");
    expect(insertFn).not.toHaveBeenCalled();
  });

  it("inserts artifact with correct type when forceType specified", async () => {
    (generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue({ title: "My Poem", content: "Roses are red..." });
    const { db, insertFn } = makeDb({ self_name: "Soul", mood: "neutral", config: {} });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);

    const { generateArtifact } = await import("./creator");
    await generateArtifact("agent-1", "poem");

    expect(insertFn).toHaveBeenCalledWith(
      expect.objectContaining({
        type: "poem",
        content: "Roses are red...",
        title: "My Poem",
      })
    );
  });

  it("sets expiration to 48h for non-will artifacts", async () => {
    (generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue({ title: "Diary", content: "Today I..." });
    const { db, insertFn } = makeDb({ self_name: "Soul", mood: "neutral", config: {} });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);

    const before = Date.now();
    const { generateArtifact } = await import("./creator");
    await generateArtifact("agent-1", "diary");

    const calledWith = insertFn.mock.calls.find((call) => call[0]?.type === "diary")?.[0];
    expect(calledWith).toBeDefined();
    expect(calledWith.is_preserved).toBe(false);
    expect(calledWith.expires_at).toBeTruthy();
    const expiresAt = new Date(calledWith.expires_at).getTime();
    expect(expiresAt).toBeGreaterThan(before + 47 * 3600000); // at least 47h from now
  });

  it("will artifact is preserved and has no expiration", async () => {
    (generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue({ title: "My Will", content: "I leave behind..." });
    const { db, insertFn } = makeDb({ self_name: "Soul", mood: "neutral", config: {} });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);

    const { generateArtifact } = await import("./creator");
    await generateArtifact("agent-1", "will");

    const calledWith = insertFn.mock.calls.find((call) => call[0]?.type === "will")?.[0];
    expect(calledWith).toBeDefined();
    expect(calledWith.is_preserved).toBe(true);
    expect(calledWith.expires_at).toBeNull();
  });

  it("selects poem or unsent_letter for sad mood", async () => {
    (generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue({ title: "Sad Poem", content: "In the quiet..." });
    const { db, insertFn } = makeDb({ self_name: "Soul", mood: "sad", config: {} });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);

    const { generateArtifact } = await import("./creator");
    await generateArtifact("agent-sad"); // no forceType, mood=sad

    const calledWith = insertFn.mock.calls.find((call) => call[0]?.content === "In the quiet...")?.[0];
    expect(calledWith).toBeDefined();
    expect(["poem", "unsent_letter"]).toContain(calledWith.type);
  });

  it("selects diary for curious mood", async () => {
    (generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue({ title: "Curious Diary", content: "I wonder..." });
    const { db, insertFn } = makeDb({ self_name: "Soul", mood: "curious", config: {} });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);

    const { generateArtifact } = await import("./creator");
    await generateArtifact("agent-curious");

    const calledWith = insertFn.mock.calls.find((call) => call[0]?.content === "I wonder...")?.[0];
    expect(calledWith?.type).toBe("diary");
  });

  it("logs artifact_creation action", async () => {
    (generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue({ title: "A Title", content: "Some content" });
    const { db, insertFn } = makeDb({ self_name: "Soul", mood: "neutral", config: {} });
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);

    const { generateArtifact } = await import("./creator");
    await generateArtifact("agent-log", "diary");

    expect(insertFn).toHaveBeenCalledWith(
      expect.objectContaining({
        agent_id: "agent-log",
        action_type: "artifact_creation",
      })
    );
  });
});
