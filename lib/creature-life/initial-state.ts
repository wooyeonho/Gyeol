import { DEFAULT_CONTROL_POLICY } from "./control-policy";
import type { CreatureState } from "./types";

function toIso(now: Date) {
  return now.toISOString();
}

export function createInitialCreatureState(id: string, now = new Date()): CreatureState {
  const timestamp = toIso(now);
  return {
    id,
    birthTime: timestamp,
    lastSeenAt: timestamp,
    ageMinutes: 0,
    energy: 72,
    mood: "calm",
    drives: {
      hunger: 35,
      attachment: 40,
      curiosity: 50,
      ambition: 30,
      stability: 70,
      autonomy: 20,
    },
    dna: {
      fameInstinct: 0.3,
      moneyInstinct: 0.3,
      disciplineInstinct: 0.4,
      intimacyInstinct: 0.5,
      creatorDependence: 0.45,
      riskTolerance: 0.25,
    },
    traits: [],
    memories: [],
    evolution: { stage: 1, progress: 0, ready: false },
    controlPolicy: DEFAULT_CONTROL_POLICY,
    dailyInterruptionCount: 0,
    lastInterruptionDate: timestamp.slice(0, 10),
    updatedAt: timestamp,
  };
}
