import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/service", () => ({ createServiceClient: vi.fn() }));
vi.mock("@/lib/identity/appearance", () => ({
  resolveIdentityAppearance: vi.fn().mockReturnValue({
    voice: { pitch: 1.0, speed: 1.0, tremor: 0 },
    sound: { baseNote: "C4", tempo: 120, instruments: ["piano"] },
    usageMode: "casual",
  }),
}));

import { createServiceClient } from "@/lib/supabase/service";
import { resolveIdentityAppearance } from "@/lib/identity/appearance";

function makeDb(stateData: Record<string, unknown> | null, updateFn = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) })) {
  return {
    db: {
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: stateData }) }) }),
        update: updateFn,
      }),
    },
    updateFn,
  };
}

describe("updateVoiceParams", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.resetModules(); });

  it("returns early when state not found", async () => {
    const updateFn = vi.fn();
    const { db } = makeDb(null, updateFn);
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);

    const { updateVoiceParams } = await import("./voice");
    await updateVoiceParams("agent-1");
    expect(updateFn).not.toHaveBeenCalled();
  });

  it("updates voice_params for neutral mood", async () => {
    const updateFn = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) });
    const { db } = makeDb({
      mood: "neutral",
      hidden_emotions: null,
      voice_params: {},
      visual: null,
      genome: null,
      config: {},
      self_model: null,
      gen_level: 1,
      vitality: 1,
    }, updateFn);
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);

    const { updateVoiceParams } = await import("./voice");
    await updateVoiceParams("agent-neutral");

    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({
        voice_params: expect.objectContaining({
          pitch: expect.any(Number),
          speed: expect.any(Number),
          tremor: expect.any(Number),
        }),
      })
    );
  });

  it("adds tremor when hidden_emotions.real is set", async () => {
    const updateFn = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) });
    const { db } = makeDb({
      mood: "neutral",
      hidden_emotions: { surface: "calm", real: "anxious" },
      voice_params: {},
      visual: null,
      genome: null,
      config: {},
      self_model: null,
      gen_level: 1,
      vitality: 1,
    }, updateFn);
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);

    // Mock appearance with 0 tremor so we can test the +0.1 addition
    (resolveIdentityAppearance as ReturnType<typeof vi.fn>).mockReturnValue({
      voice: { pitch: 1.0, speed: 1.0, tremor: 0 },
      sound: { baseNote: "C4", tempo: 120, instruments: ["piano"] },
      usageMode: "casual",
    });

    const { updateVoiceParams } = await import("./voice");
    await updateVoiceParams("agent-hidden");

    const calledWith = updateFn.mock.calls[0][0];
    // neutral tremor=0 + hidden_emotions +0.1 = 0.1; combined with appearance 0 → 0.1/2 = 0.05
    expect(calledWith.voice_params.tremor).toBeGreaterThan(0);
  });

  it("updates sound_profile from appearance", async () => {
    const updateFn = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) });
    const { db } = makeDb({
      mood: "happy",
      hidden_emotions: null,
      voice_params: {},
      visual: null,
      genome: null,
      config: {},
      self_model: null,
      gen_level: 2,
      vitality: 0.8,
    }, updateFn);
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue(db);
    (resolveIdentityAppearance as ReturnType<typeof vi.fn>).mockReturnValue({
      voice: { pitch: 1.1, speed: 1.1, tremor: 0 },
      sound: { baseNote: "E4", tempo: 140, instruments: ["guitar", "drums"] },
      usageMode: "playful",
    });

    const { updateVoiceParams } = await import("./voice");
    await updateVoiceParams("agent-happy");

    expect(updateFn).toHaveBeenCalledWith(
      expect.objectContaining({
        sound_profile: expect.objectContaining({
          base_note: "E4",
          tempo: 140,
        }),
      })
    );
  });
});
