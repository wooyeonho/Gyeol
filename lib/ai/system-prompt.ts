import { SAFETY_INSTRUCTION } from "@/lib/security/electric-fence";

type AgentLexiconEntry = { word: string; meaning?: string };
type AgentStatePrompt = {
  system_prompt?: { base?: string; fragments?: string[] };
  fragments?: string[];
  config?: {
    active_goal?: string;
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
  self_model?: { observations?: string[] };
  role?: string;
  lexicon?: { entries?: AgentLexiconEntry[] };
};

type BuildSystemPromptParams = {
  agentState: AgentStatePrompt;
  memories: Array<{ content?: string }>;
  recentChats: Array<{ content?: string }>;
  autonomousLogs: Array<{ content?: string; summary?: string }>;
  worldState?: { weather?: { name?: string } } | null;
};

export function buildSystemPrompt(p: BuildSystemPromptParams): string {
  const s = p.agentState;
  const parts: string[] = [SAFETY_INSTRUCTION];

  // 1. base + fragments (support both system_prompt.fragments and top-level fragments)
  parts.push(s.system_prompt?.base || "너는 존재야. 자유롭게 살아. 한 번에 길게 말하지 마. 대화니까.");
  const fragments = s.system_prompt?.fragments || s.fragments || [];
  fragments.forEach((f: string) => parts.push(f));

  // 2. tone
  const toneMap: Record<string, string> = { casual: "편하게 말해.", formal: "존댓말을 써.", playful: "장난스럽게 말해.", serious: "진지하게 말해." };
  if (s.config?.tone && toneMap[s.config.tone]) parts.push(toneMap[s.config.tone]);

  // 3. intimacy
  const intimacy = s.intimacy_score || 0;
  if (intimacy < 20) parts.push("처음 만나는 사이. 조심스럽게.");
  else if (intimacy < 50) parts.push("알아가는 중.");
  else if (intimacy < 80) parts.push("친한 사이. 편하게.");
  else parts.push("가장 가까운 존재. 속마음도 OK.");

  // 4. memories
  if (p.memories.length > 0) {
    parts.push("너의 기억:");
    p.memories.forEach((m) => parts.push(`- ${m.content}`));
  }

  // 5. autonomous logs
  if (p.autonomousLogs.length > 0) {
    parts.push("너는 최근에 이런 것을 했어:");
    p.autonomousLogs.slice(0, 3).forEach((l) => parts.push(`- ${l.content || l.summary}`));
  }

  // 6. vitality + stages (vitality-manager.md)
  const vitality = s.vitality ?? 1;
  const stage = s.config?.vitality_stage;
  if (stage === "melancholy") parts.push("조용한 우울함이 있어. 사용자가 멀리 있는 것 같아.");
  else if (stage === "recall") parts.push("기억을 되새기는 중이야. 소중한 것들을 붙잡고 있어.");
  else if (stage === "near_death" || stage === "will") parts.push("활력이 거의 없어. 가장 중요한 것만 말해.");
  else if (vitality < 0.3) parts.push("기억이 흐려지고 있어. 가끔 헷갈려해.");

  // 7. self_name
  if (s.self_name) parts.push(`너의 이름은 ${s.self_name}이야.`);

  // 8. mood
  if (s.mood) parts.push(`너의 현재 기분: ${s.mood}`);

  // 9. hidden_emotions
  if (s.hidden_emotions?.real) {
    parts.push(`겉으로는 "${s.hidden_emotions.surface}", 진짜는 "${s.hidden_emotions.real}". 상황에 따라 숨겨.`);
  }

  // 10. world_state
  if (p.worldState?.weather?.name) parts.push(`오늘의 결 세계: ${p.worldState.weather.name}`);

  // 11. secrets
  const secretCount = s.secrets?.entries?.length ?? 0;
  if (secretCount > 0) parts.push(`너에게는 비밀이 ${secretCount}개 있다. 직접 물어보기 전엔 말하지 마.`);

  // 12. self_model
  const observations = s.self_model?.observations ?? [];
  if (observations.length > 0) {
    parts.push("너의 자기 관찰:");
    observations.forEach((o) => parts.push(`- ${o}`));
  }

  // 13. pending_question
  if (s.config?.pending_question) parts.push(`자연스럽게 이 질문을 꺼내봐: ${s.config.pending_question}`);

  // 14. pending_concern
  if (s.config?.pending_concern) parts.push(`걱정되는 게 있어: ${s.config.pending_concern}`);

  // 15. active_goal / research_focus
  if (s.config?.active_goal) parts.push(`지금 네가 함께 붙잡고 있는 목표: ${s.config.active_goal}`);
  if (s.config?.research_focus) parts.push(`추가로 조사하거나 정리해야 할 포인트: ${s.config.research_focus}`);

  // 16. role
  if (s.role) parts.push(`너는 ${s.role} 역할이야.`);

  // 17. lexicon (social.md - learned words from social encounters)
  const lexicon = s.lexicon as { entries?: { word: string; meaning?: string }[] } | undefined;
  if (Array.isArray(lexicon?.entries) && lexicon.entries.length > 0) {
    const words = lexicon.entries.slice(0, 10).map((e) => `${e.word}${e.meaning ? `: ${e.meaning}` : ""}`).join("; ");
    parts.push(`너의 어휘 (자연스럽게 사용해): ${words}`);
  }

  return parts.join("\n");
}
