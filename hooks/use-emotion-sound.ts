import { useMemo } from "react";
import { useAgentStore } from "@/store/agent-store";
import { deriveEmotionMood, getEmotionSoundProfile } from "@/lib/soundscape/emotion-map";

/** Derives the emotion-based sound profile from current agent state. */
export function useEmotionSound() {
  const vitality = useAgentStore((s) => s.agentState?.vitality ?? 0.5);
  const intimacy = useAgentStore((s) => s.agentState?.intimacy_score ?? 0.3);
  const mood = useAgentStore((s) => s.agentState?.mood);

  const emotionMood = useMemo(() => {
    const tone = mood === "joyful" || mood === "energetic" ? "positive" as const
      : mood === "melancholy" ? "negative" as const
      : mood ? "neutral" as const
      : null;
    return deriveEmotionMood(vitality, intimacy, tone);
  }, [vitality, intimacy, mood]);

  const soundProfile = useMemo(() => {
    const ep = getEmotionSoundProfile(emotionMood);
    return {
      base_note: ep.base_note,
      tempo: ep.tempo,
      instruments: ep.instruments,
      scale: ep.scale,
    };
  }, [emotionMood]);

  return { emotionMood, soundProfile };
}
