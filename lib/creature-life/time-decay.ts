import { clamp } from "./math";
import type { CreatureState } from "./types";

export function applyTimeDecay(state: CreatureState, elapsedMinutes: number, nowIso = new Date().toISOString()): CreatureState {
  const minutes = Math.max(0, elapsedMinutes);
  const hours = minutes / 60;
  return {
    ...state,
    ageMinutes: Math.round(state.ageMinutes + minutes),
    lastSeenAt: nowIso,
    energy: clamp(state.energy - hours * 1.8),
    mood: state.controlPolicy.emergencyPause ? "paused" : state.mood,
    drives: {
      ...state.drives,
      hunger: clamp(state.drives.hunger + minutes * 0.02),
      attachment: clamp(state.drives.attachment + minutes * 0.01),
      stability: clamp(state.drives.stability - minutes * 0.015),
      autonomy: clamp(state.drives.autonomy + minutes * 0.004),
    },
    updatedAt: nowIso,
  };
}
