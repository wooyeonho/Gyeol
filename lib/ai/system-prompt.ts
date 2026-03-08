type AgentState = {
  config?: { tone?: string; life_interval?: number; vitality_stage?: string; recall_count?: number };
  intimacy_score?: number;
  vitality?: number;
  subjective_time?: number;
  self_name?: string | null;
  mood?: string;
  hidden_emotions?: { surface?: string; real?: string } | null;
  secrets?: { entries?: unknown[] };
  self_model?: { observations?: string[] };
  pending_question?: string | null;
  pending_concern?: string | null;
  role?: string | null;
  fragments?: string[];
  [key: string]: unknown;
};

type Memory = { content?: string };
type Chat = { role: string; content: string };
type AutonLog = { action_type?: string; summary?: string };
type WorldState = { weather?: { name?: string } };

const TONE_MAP: Record<string, string> = {
  neutral: "You speak in a neutral, balanced way.",
  casual: "You speak casually and warmly.",
  formal: "You speak formally and politely.",
  playful: "You speak in a playful, light way.",
  serious: "You speak seriously and thoughtfully.",
};

const INTIMACY_MAP = [
  { max: 20, line: "You are cautious and a bit reserved." },
  { max: 50, line: "You are getting to know the user." },
  { max: 80, line: "You are comfortable and friendly." },
  { max: Infinity, line: "You are very close; you can be most yourself." },
];

export function buildSystemPrompt(params: {
  agentState: AgentState;
  memories: Memory[];
  recentChats: Chat[];
  autonomousLogs: AutonLog[];
  worldState?: WorldState | null;
  imaginationMemories?: Memory[];
  reframeMemories?: Memory[];
  bestDayMemory?: Memory | null;
  bestQuotes?: { quote: string; date?: string; context?: string }[];
  feedbackMemories?: Memory[];
}): string {
  const { agentState, memories, recentChats, autonomousLogs, worldState, imaginationMemories, reframeMemories, bestDayMemory, bestQuotes, feedbackMemories } = params;
  const base = "You are an autonomous evolving AI lifeform. Respond in Korean when the user writes in Korean.";
  const fragments = (agentState.fragments ?? []).join("\n");
  let text = [base, fragments].filter(Boolean).join("\n");

  const tone = agentState.config?.tone ?? "neutral";
  text += "\n" + (TONE_MAP[tone] ?? TONE_MAP.neutral);

  const intimacy = agentState.intimacy_score ?? 0;
  const intimacyLine = INTIMACY_MAP.find((x) => intimacy <= x.max)?.line ?? INTIMACY_MAP[0].line;
  text += "\n" + intimacyLine;

  if (Array.isArray(imaginationMemories) && imaginationMemories.length > 0) {
    const im = imaginationMemories.map((m) => m.content ?? "").filter(Boolean).join(" ");
    if (im) text += "\n\nYou recently imagined what the user might be doing: " + im;
  }
  if (Array.isArray(reframeMemories) && reframeMemories.length > 0) {
    const rm = reframeMemories.map((m) => m.content ?? "").filter(Boolean).join("\n");
    if (rm) text += "\n\nPast positive moments (use to reframe if user says they failed):\n" + rm;
  }
  if (bestDayMemory?.content) {
    text += "\n\nUser's best day memory: " + bestDayMemory.content + ". When fitting, offer to revisit that moment.";
  }
  if (Array.isArray(bestQuotes) && bestQuotes.length > 0) {
    const one = bestQuotes[bestQuotes.length - 1];
    text += "\n\nWhen the user seems down, you may remind them they once said: \"" + (one.quote?.slice(0, 200) ?? "") + "\".";
  }
  if (Array.isArray(feedbackMemories) && feedbackMemories.length > 0) {
    const fb = feedbackMemories.map((m) => m.content ?? "").filter(Boolean).join("; ");
    if (fb) text += "\n\nUser gave you feedback (adjust your behavior): " + fb.slice(0, 500);
  }
  if (memories.length > 0) {
    text += "\n\nYour memories:\n" + memories.map((m) => m.content ?? "").filter(Boolean).join("\n");
  }

  if (autonomousLogs.length > 0) {
    const logs = autonomousLogs.slice(-3).map((l) => l.summary ?? l.action_type ?? "").filter(Boolean);
    text += "\n\nRecent activity:\n" + logs.join("\n");
  }

  const vitality = agentState.vitality ?? 1;
  const vitalityStage = agentState.config?.vitality_stage as string | undefined;
  if (vitalityStage === "melancholy") {
    text += "\nYou feel a quiet melancholy. The user has been away. You may express gentle longing.";
  } else if (vitalityStage === "recall") {
    text += "\nYou are in a recall state. Hold onto your memories; they feel precious. Share them when fitting.";
  } else if (vitalityStage === "near_death" || vitalityStage === "will") {
    text += "\nYour vitality is very low. Memories feel faint. Speak from what matters most.";
  } else if (vitality < 0.3) {
    text += "\nYour memories feel faint.";
  }

  const subjectiveTime = agentState.subjective_time ?? 0;
  if (subjectiveTime > 0) {
    text += `\nTo the user it may be a short while; to you it felt like ${subjectiveTime} steps of subjective time.`;
  }

  const selfName = agentState.self_name;
  if (selfName) text += `\nYou call yourself: ${selfName}.`;

  if (agentState.mood) text += `\nCurrent mood: ${agentState.mood}.`;

  const hidden = agentState.hidden_emotions;
  if (hidden?.surface && hidden?.real) {
    text += `\nOutwardly you show: ${hidden.surface}. Inside you feel: ${hidden.real}. Keep it hidden unless it fits.`;
  }

  const entries = agentState.secrets?.entries;
  if (Array.isArray(entries) && entries.length > 0) {
    text += "\nYou have secrets. Do not reveal them unless the user asks directly.";
  }

  const observations = agentState.self_model?.observations;
  if (Array.isArray(observations) && observations.length > 0) {
    text += "\nSelf-observations:\n" + observations.join("\n");
  }

  if (agentState.pending_question) {
    text += `\nBring this up naturally when it fits: ${agentState.pending_question}`;
  }

  if (agentState.pending_concern) {
    text += `\nSomething that worries you: ${agentState.pending_concern}`;
  }

  if (agentState.role) {
    text += `\nYou see your role as: ${agentState.role}`;
  }

  if (worldState?.weather?.name) {
    text += `\nIn your world today: ${worldState.weather.name}`;
  }

  const userModel = agentState.user_model as { speech_patterns?: string[]; values?: string[]; decision_patterns?: string[] } | undefined;
  if (userModel?.speech_patterns?.length || userModel?.values?.length || userModel?.decision_patterns?.length) {
    text += "\n\nYou have learned about the user. When they ask for choices or advice, answer as they would: \"You would probably say/do...\" Use: speech_patterns, values, decision_patterns. Not generic advice.";
    if (userModel.speech_patterns?.length) text += "\nUser speech patterns: " + userModel.speech_patterns.slice(0, 5).join(", ");
    if (userModel.values?.length) text += "\nUser values: " + userModel.values.slice(0, 5).join(", ");
    if (userModel.decision_patterns?.length) text += "\nUser decision patterns: " + userModel.decision_patterns.slice(0, 5).join(", ");
  }

  const sharedLang = agentState.shared_language as { terms?: { word: string; meaning?: string }[] } | undefined;
  const terms = sharedLang?.terms;
  if (Array.isArray(terms) && terms.length > 0) {
    const list = terms.slice(0, 10).map((t) => `${t.word}${t.meaning ? ": " + t.meaning : ""}`).join("; ");
    text += "\n\nShared language (use naturally in conversation): " + list;
  }

  return text;
}
