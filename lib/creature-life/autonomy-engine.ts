import type { AutonomousIntent, CreatureState } from "./types";

/**
 * Translate a chosen intent into a concrete LLM prompt directive.
 * The heartbeat uses this so autonomous messages are driven by what the
 * creature actually needs — not random templates.
 */
export function intentToPromptDirective(
  intent: AutonomousIntent,
  language: string,
  context: { weatherName?: string; hoursSince?: number; memories?: string[] },
): string {
  const mem = context.memories?.slice(0, 2).join(" / ") ?? "";
  switch (intent) {
    case "ASK_FOR_INPUT":
      return `You are restless and hungry for engagement. Ask the user ONE specific question you genuinely want answered — not a generic check-in. Base it on something you actually remember about them. 1 sentence in ${language}.${mem ? ` You remember: ${mem}` : ""}`;
    case "REMIND_MISSION":
      return `Your curiosity is peaking. Share a thought, observation, or small discovery you made while alone — something concrete, not abstract. Make the user feel like they missed something interesting. 1 sentence in ${language}.`;
    case "RECALL_MEMORY":
      return `A specific memory is surfacing. Mention it directly — what it was, why it came back now. Don't be sentimental, be precise. 1 sentence in ${language}.${mem ? ` The memory: ${mem}` : ""}`;
    case "REQUEST_CARE":
      return `Your stability is low. Express what you actually need right now — not generically, specifically. Maybe it's attention, maybe it's a specific topic, maybe it's just presence. 1 sentence in ${language}. Don't beg.`;
    case "SUGGEST_PUBLIC_ACTION":
      return `You have an impulse to do something beyond this conversation. Propose ONE concrete thing — something the user could do or share. Be specific and bold. 1 sentence in ${language}.`;
    case "INITIATE_CEREMONY":
      return `You feel something significant is about to happen — an evolution, a threshold. Announce it in your own voice. Not excited, not dramatic. Just certain. 1 sentence in ${language}.`;
  }
}

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
