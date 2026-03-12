import { createServiceClient } from "@/lib/supabase/service";
import { resolveIdentityAppearance } from "@/lib/identity/appearance";

const MOOD_PARAMS: Record<string, { pitch: number; speed: number; tremor: number }> = {
  sad: { pitch: 0.9, speed: 0.85, tremor: 0.15 },
  happy: { pitch: 1.1, speed: 1.1, tremor: 0 },
  curious: { pitch: 1.05, speed: 1.05, tremor: 0.02 },
  angry: { pitch: 1.05, speed: 1.15, tremor: 0.08 },
  neutral: { pitch: 1.0, speed: 1.0, tremor: 0 },
};

export async function updateVoiceParams(agentId: string): Promise<void> {
  const service = createServiceClient();
  const { data: stateRow } = await service
    .from("agent_state")
    .select("mood, hidden_emotions, voice_params, visual, genome, config, self_model, gen_level, vitality")
    .eq("agent_id", agentId)
    .single();
  if (!stateRow) return;

  const state = stateRow as {
    mood?: string;
    hidden_emotions?: { surface?: string; real?: string } | null;
    voice_params?: { pitch?: number; speed?: number; tremor?: number };
    visual?: { color?: string | null; shape?: string | null; glow?: number | null; particles?: number | null; animation?: string | null; background?: string | null } | null;
    genome?: { species?: string | null; mutations?: string[] | null } | null;
    config?: { mutation_trait?: string | null; usage_profile?: { primary_mode?: string | null; updated_at?: string | null } | null; tone?: string | null } | null;
    self_model?: { current_role?: string | null; identity_statement?: string | null } | null;
    gen_level?: number | null;
    vitality?: number | null;
  };
  const moodKey = (state.mood ?? "neutral").toLowerCase();
  const moodParams = MOOD_PARAMS[moodKey] ?? MOOD_PARAMS.neutral;
  let tremor = moodParams.tremor;
  if (state.hidden_emotions?.real) tremor = Math.min(1, tremor + 0.1);
  const appearance = resolveIdentityAppearance(
    {
      visual: state.visual,
      genome: state.genome,
      config: state.config,
      selfModel: state.self_model,
      genLevel: state.gen_level ?? 1,
      vitality: state.vitality ?? 1,
      mood: state.mood ?? null,
    },
    "ko"
  );
  const voiceParams = {
    pitch: Number(((moodParams.pitch + appearance.voice.pitch) / 2).toFixed(2)),
    speed: Number(((moodParams.speed + appearance.voice.speed) / 2).toFixed(2)),
    tremor: Number(Math.min(1, (tremor + appearance.voice.tremor) / 2).toFixed(2)),
  };
  const soundProfile = {
    base_note: appearance.sound.baseNote,
    tempo: appearance.sound.tempo,
    instruments: appearance.sound.instruments,
  };
  const currentConfig = state.config ?? {};
  const suggestedTone =
    appearance.usageMode === "playful"
      ? "playful"
      : appearance.usageMode === "strategic"
        ? "serious"
        : appearance.usageMode === "intimate"
          ? "casual"
          : appearance.usageMode === "reflective" || appearance.usageMode === "surreal"
            ? "formal"
            : currentConfig.tone ?? "casual";

  await service
    .from("agent_state")
    .update({
      voice_params: voiceParams,
      sound_profile: soundProfile,
      config: { ...currentConfig, tone: suggestedTone },
    })
    .eq("agent_id", agentId);
}
