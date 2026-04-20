import type { CreatureDNA } from "@/lib/genome/dna";

// ─── Database row: episodes table ────────────────────────────────────────────

export interface Episode {
  id:             string;
  agentId:        string;
  /** 1-2 sentence episodic summary in the user's native language */
  content:        string;
  /** Gemini 768-dim embedding — null until async embedding worker fills it */
  embedding:      number[] | null;
  /** Emotional polarity: -1.0 (negative) to +1.0 (positive) */
  valence:        number;
  /** Full CreatureDNA snapshot at the moment this episode was formed */
  axes:           CreatureDNA;
  /** Salience weight: starts at 1.0, decays via scheduled job */
  weight:         number;
  /** How many times this episode has been retrieved as context */
  referenceCount: number;
  createdAt:      string;
}

// ─── match_episodes() RPC response row ───────────────────────────────────────

export interface EpisodeMatchResult {
  id:         string;
  content:    string;
  /** Blended score: cosine similarity × time decay × reference boost × weight */
  similarity: number;
  valence:    number;
  axes:       CreatureDNA;
  createdAt:  string;
}

// ─── What OpenClaw extracts from the LLM response ────────────────────────────

export interface EpisodicExtraction {
  /** 1-2 sentence narrative summary (user's language) */
  content: string;
  /** Emotional polarity of the event as judged by the LLM: -1.0..+1.0 */
  valence: number;
  /** Comma-separated DNA axis names most activated during this conversation */
  axesRaw: string;
}

// ─── Parameters for match_episodes() RPC ─────────────────────────────────────

export interface MatchEpisodesParams {
  agentId:      string;
  embedding:    number[];
  matchCount?:  number;
  valenceMin?:  number;
  valenceMax?:  number;
}
