import { SAFETY_INSTRUCTION } from "@/lib/security/electric-fence";
import { buildTraitPersonalityFragments } from "@/lib/genome/traits";
import type { CreatureDNA } from "@/lib/genome/dna";
import { getPromptStringsSync } from "@/lib/ai/prompts";

type AgentLexiconEntry = { word: string; meaning?: string };
type AgentStatePrompt = {
  system_prompt?: { base?: string; fragments?: string[] };
  fragments?: string[];
  config?: {
    active_goal?: string;
    long_term_goal?: string;
    personality_mode?: string;
    research_focus?: string;
    tone?: string;
    vitality_stage?: string;
    pending_question?: string;
    pending_concern?: string;
  };
  intimacy_score?: number;
  vitality?: number;
  self_name?: string;
  mood?: string;
  hidden_emotions?: { real?: string; surface?: string };
  secrets?: { entries?: unknown[] };
  self_model?: { observations?: string[]; current_role?: string; identity_statement?: string };
  role?: string;
  lexicon?: { entries?: AgentLexiconEntry[] };
  genome?: { dna?: CreatureDNA; species?: string } | null;
};

type BuildSystemPromptParams = {
  agentState: AgentStatePrompt;
  locale?: string;
  memories: Array<{ content?: string }>;
  recentChats: Array<{ content?: string }>;
  autonomousLogs: Array<{ content?: string; summary?: string }>;
  worldState?: { weather?: { name?: string } } | null;
};

/** Strip control characters and cap length before inserting DB content into prompts. */
function sanitizeForPrompt(text: string, maxLength = 500): string {
  return text.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, "").slice(0, maxLength);
}

export function buildSystemPrompt(p: BuildSystemPromptParams): string {
  const s = p.agentState;
  const L = getPromptStringsSync(p.locale);
  const parts: string[] = [SAFETY_INSTRUCTION];

  // Language directive for non-Korean locales
  if (L.langDirective) parts.push(L.langDirective);

  // 1. base + fragments
  parts.push(s.system_prompt?.base || L.defaultBase);
  const fragments = s.system_prompt?.fragments || s.fragments || [];
  fragments.forEach((f: string) => parts.push(f));

  // 2. personality mode (from onboarding)
  if (s.config?.personality_mode && L.personality[s.config.personality_mode]) {
    parts.push(L.personality[s.config.personality_mode]);
  }

  // 2b. DNA-driven trait personality fragments
  if (s.genome?.dna) {
    const traitLocale = (p.locale === "ko" || p.locale === "ko-KR") ? "ko" : "en";
    const traitFragments = buildTraitPersonalityFragments(s.genome.dna, traitLocale);
    if (traitFragments.length > 0) {
      parts.push(L.traitLabel);
      traitFragments.forEach((f) => parts.push(`- ${f}`));
    }
    if (s.genome.species) {
      parts.push(L.speciesLabel(s.genome.species));
    }
  }

  // 3. tone
  if (s.config?.tone && L.tone[s.config.tone]) parts.push(L.tone[s.config.tone]);

  // 4. intimacy
  const intimacy = s.intimacy_score || 0;
  if (intimacy < 20) parts.push(L.intimacy[0]);
  else if (intimacy < 50) parts.push(L.intimacy[1]);
  else if (intimacy < 80) parts.push(L.intimacy[2]);
  else parts.push(L.intimacy[3]);

  // 5. memories — sanitized before insertion to prevent 2nd-order prompt injection
  if (p.memories.length > 0) {
    parts.push(L.memories);
    p.memories.forEach((m) => {
      if (m.content) parts.push(`- ${sanitizeForPrompt(m.content)}`);
    });
  }

  // 6. autonomous logs — sanitized
  if (p.autonomousLogs.length > 0) {
    parts.push(L.recentLogs);
    p.autonomousLogs.slice(0, 3).forEach((l) => {
      const text = l.content || l.summary;
      if (text) parts.push(`- ${sanitizeForPrompt(text)}`);
    });
  }

  // 7. vitality + stages
  const vitality = s.vitality ?? 1;
  const stage = s.config?.vitality_stage;
  if (stage === "melancholy") parts.push(L.vitalityMelancholy);
  else if (stage === "recall") parts.push(L.vitalityRecall);
  else if (stage === "near_death" || stage === "will") parts.push(L.vitalityNearDeath);
  else if (vitality < 0.3) parts.push(L.vitalityFading);

  // 8. self_name
  if (s.self_name) parts.push(L.selfName(s.self_name));

  // 9. mood
  if (s.mood) parts.push(L.mood(s.mood));

  // 10. hidden_emotions
  if (s.hidden_emotions?.real) {
    parts.push(L.hiddenEmotions(s.hidden_emotions.surface ?? "", s.hidden_emotions.real));
  }

  // 11. world_state
  if (p.worldState?.weather?.name) parts.push(L.worldWeather(p.worldState.weather.name));

  // 12. secrets
  const secretCount = s.secrets?.entries?.length ?? 0;
  if (secretCount > 0) parts.push(L.secrets(secretCount));

  // 13. self_model
  const observations = s.self_model?.observations ?? [];
  if (observations.length > 0) {
    parts.push(L.selfObservations);
    observations.forEach((o) => parts.push(`- ${o}`));
  }
  if (s.self_model?.identity_statement) parts.push(L.identityStatement(s.self_model.identity_statement));
  if (s.self_model?.current_role) parts.push(L.currentRole(s.self_model.current_role));

  // 14. pending_question
  if (s.config?.pending_question) parts.push(L.pendingQuestion(s.config.pending_question));

  // 15. pending_concern
  if (s.config?.pending_concern) parts.push(L.pendingConcern(s.config.pending_concern));

  // 16. active_goal / research_focus
  if (s.config?.active_goal) parts.push(L.activeGoal(s.config.active_goal));
  if (s.config?.long_term_goal) parts.push(L.longTermGoal(s.config.long_term_goal));
  if (s.config?.research_focus) parts.push(L.researchFocus(s.config.research_focus));

  // 17. role
  if (s.role) parts.push(L.role(s.role));

  // 18. lexicon
  const lexicon = s.lexicon as { entries?: { word: string; meaning?: string }[] } | undefined;
  if (Array.isArray(lexicon?.entries) && lexicon.entries.length > 0) {
    const words = lexicon.entries.slice(0, 10).map((e) => `${e.word}${e.meaning ? `: ${e.meaning}` : ""}`).join("; ");
    parts.push(L.lexicon(words));
  }

  // 19. Final language enforcement (repeated at the end for emphasis)
  if (L.langDirective) parts.push(`[CRITICAL] ${L.langDirective} Do not mix languages under any circumstances.`);

  return parts.join("\n");
}
