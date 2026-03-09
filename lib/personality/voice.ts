import { createServiceClient } from "@/lib/supabase/service";

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
    .select("mood, hidden_emotions, voice_params")
    .eq("agent_id", agentId)
    .single();
  if (!stateRow) return;

  const state = stateRow as { mood?: string; hidden_emotions?: { surface?: string; real?: string } | null; voice_params?: { pitch?: number; speed?: number; tremor?: number } };
  const moodKey = (state.mood ?? "neutral").toLowerCase();
  const moodParams = MOOD_PARAMS[moodKey] ?? MOOD_PARAMS.neutral;
  let tremor = moodParams.tremor;
  if (state.hidden_emotions?.real) tremor = Math.min(1, tremor + 0.1);
  const voiceParams = {
    pitch: moodParams.pitch,
    speed: moodParams.speed,
    tremor,
  };
  await service.from("agent_state").update({ voice_params: voiceParams }).eq("agent_id", agentId);
}
