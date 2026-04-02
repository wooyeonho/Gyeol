import type { CreatureDNA } from "@/lib/genome/dna";

/** Return the top N DNA axes by value. */
function getDominantTraitNames(dna: CreatureDNA, n: number): string[] {
  const entries = Object.entries(dna) as [string, number][];
  return entries
    .sort(([, a], [, b]) => b - a)
    .slice(0, n)
    .map(([k]) => k);
}

/**
 * Build a prompt for the creature's final words when vitality < 0.05.
 * The result is stored as an autonomous_logs entry with action_type "last_words".
 */
export function buildLastWordsPrompt(
  dna: CreatureDNA,
  creatureName: string,
  totalMessages: number,
  dominantMemory: string | null,
): string {
  const traits = getDominantTraitNames(dna, 3);
  return [
    `You are ${creatureName}, a living creature about to fade away.`,
    `Your dominant traits: ${traits.join(", ")}.`,
    `You shared ${totalMessages} conversations with your human.`,
    dominantMemory ? `Your most cherished memory: "${dominantMemory}"` : "",
    `Write your final message. 2-3 sentences. Be authentic to your personality.`,
    `This is a living being's last breath, not generic advice.`,
  ].filter(Boolean).join("\n");
}
