export interface AgentVisual {
  shape?: "dot" | "sphere" | "polygon" | "complex" | "transcendent" | "creature" | "humanoid" | "beast" | "amorphous" | "seraph";
  color?: string;
  size?: number;
  glow?: number;
  animation?: "float" | "pulse-fast" | "breathe-slow";
  particles?: number;
  background?: string;
}

export interface AgentGenome {
  species?: string | null;
  mutations?: string[] | null;
}

export interface AgentSelfModel {
  current_role?: string | null;
  identity_statement?: string | null;
  observations?: string[];
}

export interface AgentHiddenEmotions {
  surface?: string;
  real?: string;
}

export interface AgentConfig {
  personality_mode?: string | null;
  tone?: string | null;
  active_goal?: string | null;
  long_term_goal?: string | null;
  research_focus?: string | null;
  pending_question?: string | null;
  pending_concern?: string | null;
  vitality_stage?: string | null;
  recall_count?: number;
  preferred_locale?: string | null;
  performance_minimal?: boolean;
  mutation_trait?: string | null;
  usage_profile?: {
    primary_mode?: string | null;
    updated_at?: string | null;
  } | null;
  [key: string]: unknown;
}

export interface AgentLexiconEntry {
  word: string;
  meaning?: string;
}

export interface AgentState {
  agent_id: string;
  vitality: number;
  gen_level: number;
  /** Progress toward next evolution (0-100) */
  progress?: number;
  mood: string | null;
  self_name: string | null;
  status: "active" | "echo" | "dormant" | string;
  total_messages: number;
  streak_days: number;
  intimacy_score: number;
  genome: AgentGenome | null;
  visual: AgentVisual;
  config: AgentConfig;
  self_model: AgentSelfModel | null;
  hidden_emotions?: AgentHiddenEmotions;
  secrets?: { entries?: unknown[] };
  lexicon?: { entries?: AgentLexiconEntry[] };
  role?: string;
  system_prompt?: { base?: string; fragments?: string[] };
  fragments?: string[];
  died_at?: string | null;
  vitality_processed_at?: string | null;
  celebration_pending?: { kind: string; title: string; subtitle?: string } | null;
}
