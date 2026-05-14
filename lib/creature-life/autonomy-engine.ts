import type { AutonomousIntent, CreatureState } from "./types";

function requiredAutonomyLevel(intent: AutonomousIntent): 1 | 2 | 3 {
  if (intent === "SUGGEST_PUBLIC_ACTION") return 2;
  if (intent === "INITIATE_CEREMONY") return 1;
  return 1;
}

export function chooseAutonomousIntent(state: CreatureState): AutonomousIntent | null {
  if (state.controlPolicy.emergencyPause) return null;
  if (state.evolution.ready) return "INITIATE_CEREMONY";
  if (state.drives.stability < 35) return "REQUEST_CARE";
  if (state.drives.hunger > 80) return "ASK_FOR_INPUT";
  if (state.drives.attachment > 75 && state.memories.length > 0) return "RECALL_MEMORY";
  if (state.drives.ambition > 70 && state.controlPolicy.allowPublicSuggestions) return "SUGGEST_PUBLIC_ACTION";
  if (state.drives.curiosity > 78) return "REMIND_MISSION";
  return null;
}

export function canCreatureActUnderPolicy(state: CreatureState, intent: AutonomousIntent | null): intent is AutonomousIntent {
  if (!intent) return false;
  const policy = state.controlPolicy;
  if (policy.emergencyPause || policy.autonomyLevel === 0) return false;
  if (state.dailyInterruptionCount >= policy.maxDailyInterruptions) return false;
  if (intent === "SUGGEST_PUBLIC_ACTION" && !policy.allowPublicSuggestions) return false;
  return policy.autonomyLevel >= requiredAutonomyLevel(intent);
}

export function chooseControlledAutonomousIntent(state: CreatureState): AutonomousIntent | null {
  const intent = chooseAutonomousIntent(state);
  return canCreatureActUnderPolicy(state, intent) ? intent : null;
}
