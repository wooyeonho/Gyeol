import { applyTimeDecay } from "./time-decay";
import { clamp, clamp01 } from "./math";
import type { CreatureEvent, CreatureMood, CreatureState } from "./types";

function sameDay(a: string, b: string) {
  return a.slice(0, 10) === b.slice(0, 10);
}

function deriveMood(state: CreatureState): CreatureMood {
  if (state.controlPolicy.emergencyPause) return "paused";
  if (state.drives.stability < 35) return "restless";
  if (state.drives.attachment > 75 && state.drives.hunger > 65) return "lonely";
  if (state.drives.curiosity > 72) return "alert";
  if (state.drives.ambition > 68) return "focused";
  return "calm";
}

function withDerivedMood(state: CreatureState, at: string): CreatureState {
  return { ...state, mood: deriveMood(state), updatedAt: at };
}

function addUnique(values: string[], value: string) {
  return values.includes(value) ? values : [...values, value];
}

export function creatureReducer(state: CreatureState, event: CreatureEvent): CreatureState {
  switch (event.type) {
    case "USER_RETURNED": {
      const decayed = applyTimeDecay(state, event.elapsedMinutes, event.at);
      const resetDaily = sameDay(decayed.lastInterruptionDate, event.at)
        ? decayed
        : { ...decayed, dailyInterruptionCount: 0, lastInterruptionDate: event.at.slice(0, 10) };
      return withDerivedMood(resetDaily, event.at);
    }
    case "MESSAGE_SENT":
      return withDerivedMood({
        ...state,
        energy: clamp(state.energy + 1),
        drives: {
          ...state.drives,
          hunger: clamp(state.drives.hunger - Math.max(8, Math.min(24, event.textLength / 10))),
          curiosity: clamp(state.drives.curiosity + 4),
          attachment: clamp(state.drives.attachment + 2),
          autonomy: clamp(state.drives.autonomy + 1),
        },
        evolution: { ...state.evolution, progress: clamp(state.evolution.progress + 1.5) },
      }, event.at);
    case "TOUCHED": {
      const isLong = event.intensity === "long";
      return withDerivedMood({
        ...state,
        energy: clamp(state.energy + (isLong ? 4 : 2)),
        drives: {
          ...state.drives,
          stability: clamp(state.drives.stability + (isLong ? 10 : 5)),
          attachment: clamp(state.drives.attachment + (isLong ? 6 : 3)),
          hunger: clamp(state.drives.hunger - (isLong ? 4 : 2)),
        },
      }, event.at);
    }
    case "CARE_COMPLETED":
      return withDerivedMood({
        ...state,
        energy: clamp(state.energy + 8),
        drives: {
          ...state.drives,
          stability: clamp(state.drives.stability + 12),
          hunger: clamp(state.drives.hunger - 12),
          attachment: clamp(state.drives.attachment + 4),
        },
      }, event.at);
    case "MISSION_COMPLETED": {
      const dna = { ...state.dna };
      const drives = { ...state.drives, ambition: clamp(state.drives.ambition + 8) };
      if (event.category === "money") dna.moneyInstinct = clamp01(dna.moneyInstinct + 0.04);
      if (event.category === "fame") dna.fameInstinct = clamp01(dna.fameInstinct + 0.04);
      if (event.category === "discipline") {
        dna.disciplineInstinct = clamp01(dna.disciplineInstinct + 0.04);
        drives.stability = clamp(drives.stability + 5);
      }
      if (event.category === "intimacy") {
        dna.intimacyInstinct = clamp01(dna.intimacyInstinct + 0.04);
        drives.attachment = clamp(drives.attachment + 8);
      }
      return withDerivedMood({ ...state, dna, drives, evolution: { ...state.evolution, progress: clamp(state.evolution.progress + 3) } }, event.at);
    }
    case "MEMORY_CREATED":
    case "MEMORY_RECALLED":
      return withDerivedMood({ ...state, memories: addUnique(state.memories, event.memoryId), drives: { ...state.drives, attachment: clamp(state.drives.attachment + 2) } }, event.at);
    case "TRAIT_EMERGED":
      return withDerivedMood({ ...state, traits: addUnique(state.traits, event.trait), evolution: { ...state.evolution, progress: clamp(state.evolution.progress + 8) } }, event.at);
    case "DNA_SHIFT":
      return withDerivedMood({ ...state, dna: { ...state.dna, [event.axis]: clamp01(state.dna[event.axis] + event.delta) } }, event.at);
    case "EVOLUTION_READY":
      return withDerivedMood({ ...state, evolution: { ...state.evolution, ready: true, progress: 100 } }, event.at);
    case "CONTROL_POLICY_CHANGED":
      return withDerivedMood({ ...state, controlPolicy: { ...state.controlPolicy, ...event.patch } }, event.at);
    case "CREATURE_PAUSED":
      return withDerivedMood({ ...state, controlPolicy: { ...state.controlPolicy, emergencyPause: event.paused } }, event.at);
    case "AUTONOMOUS_SIGNAL_SHOWN":
      return withDerivedMood({
        ...state,
        dailyInterruptionCount: sameDay(state.lastInterruptionDate, event.at) ? state.dailyInterruptionCount + 1 : 1,
        lastInterruptionDate: event.at.slice(0, 10),
      }, event.at);
    default:
      return state;
  }
}
