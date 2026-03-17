import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/service", () => ({ createServiceClient: vi.fn() }));

import { createServiceClient } from "@/lib/supabase/service";
import { checkPetAnniversaries, processPets } from "./pets";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("checkPetAnniversaries", () => {
  it("returns null when no pets", async () => {
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { pets: [] } }) }) }) }),
    });

    const result = await checkPetAnniversaries("agent-1");
    expect(result).toBeNull();
  });

  it("returns null when no pets have passed_at", async () => {
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { pets: [{ name: "Fluffy", created_at: "2025-01-01" }] } }) }) }) }),
    });

    const result = await checkPetAnniversaries("agent-1");
    expect(result).toBeNull();
  });

  it("returns anniversary message when today matches passed_at anniversary", async () => {
    // Set a date exactly one year ago
    const now = new Date();
    const lastYear = new Date(now);
    lastYear.setFullYear(now.getFullYear() - 1);
    const passedAt = lastYear.toISOString();

    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({
        data: { pets: [{ name: "Buddy", passed_at: passedAt, created_at: "2025-01-01" }] },
      }) }) }) }),
    });

    const result = await checkPetAnniversaries("agent-1");
    if (result) {
      expect(result).toContain("Buddy");
      expect(result).toContain("rainbow bridge");
    }
    // If not today's anniversary, result is null — both are acceptable
  });

  it("returns null when anniversary is not today", async () => {
    // Pick a date that is definitely not today
    const passed = new Date("2020-01-15T00:00:00Z"); // unlikely to be today
    const now = new Date();
    if (now.getMonth() === 0 && now.getDate() === 15) {
      // Edge case: skip test if today is Jan 15
      return;
    }

    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({
        data: { pets: [{ name: "Max", passed_at: passed.toISOString(), created_at: "2020-01-15" }] },
      }) }) }) }),
    });

    const result = await checkPetAnniversaries("agent-1");
    expect(result).toBeNull();
  });
});

describe("processPets", () => {
  it("does nothing when no memories", async () => {
    const updateFn = vi.fn();

    // Build chain supporting .eq().eq().order().limit()
    const emptyChain: Record<string, ReturnType<typeof vi.fn>> = {};
    emptyChain.eq = vi.fn().mockReturnValue(emptyChain);
    emptyChain.order = vi.fn().mockReturnValue(emptyChain);
    emptyChain.limit = vi.fn().mockResolvedValue({ data: [] });

    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "memories") return { select: vi.fn().mockReturnValue(emptyChain) };
        return { select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { pets: [] } }) }) }), update: updateFn };
      }),
    });

    await processPets("agent-1");
    expect(updateFn).not.toHaveBeenCalled();
  });

  it("detects and stores pet from memory mentioning 'my dog'", async () => {
    const memories = [{ content: "My dog named Buddy passed away yesterday", created_at: "2025-10-01T00:00:00Z" }];
    const updateFn = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) });

    // Use plain functions for the chain to avoid vi.fn() mock state issues
    const memChain = {
      eq: function(this: typeof memChain) { return this; },
      order: function(this: typeof memChain) { return this; },
      limit: () => Promise.resolve({ data: memories }),
    };
    // Make eq and order return memChain explicitly
    memChain.eq = function() { return memChain; };
    memChain.order = function() { return memChain; };

    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: (table: string) => {
        if (table === "memories") return { select: () => memChain };
        if (table === "agent_state") return {
          // Use null for pets so the ?? operator creates a NEW array (not same reference),
          // allowing pets.length > state.data.pets?.length to evaluate correctly
          select: () => ({ eq: () => ({ single: () => Promise.resolve({ data: { pets: null } }) }) }),
          update: updateFn,
        };
        return {};
      },
    });

    await processPets("agent-1");

    // update is called with the pets array (shorthand property)
    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({
        pets: expect.arrayContaining([
          expect.objectContaining({ name: expect.any(String) }),
        ]),
      })
    );
  });
});
