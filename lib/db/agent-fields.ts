/**
 * Agent state field selectors for query optimization.
 *
 * The agent_state table has 35+ columns. Most operations only need a subset.
 * Using targeted selects reduces payload size and DB load.
 *
 * HOT fields: frequently read/written on every chat turn or heartbeat.
 * COLD fields: rarely change; only needed for specific features.
 */

/** Fields updated on every chat turn or heartbeat cycle. */
export const HOT_FIELDS = [
  "agent_id",
  "mood",
  "vitality",
  "status",
  "total_messages",
  "streak_days",
  "intimacy_score",
  "config",
  "visual",
  "progress",
  "vitality_processed_at",
] as const;

/** Fields only needed for specific features (genome editor, profile view, etc.). */
export const COLD_FIELDS = [
  "genome",
  "career",
  "education",
  "fragments",
  "self_model",
  "self_name",
  "hidden_emotions",
  "secrets",
  "lexicon",
  "role",
  "system_prompt",
  "died_at",
  "gen_level",
] as const;

/** Comma-separated select string for hot-path queries. */
export const HOT_SELECT = HOT_FIELDS.join(", ");

/** Comma-separated select string for full agent state. */
export const FULL_SELECT = [...HOT_FIELDS, ...COLD_FIELDS].join(", ");

/** Select string for chat context (needs mood + identity but not career/education). */
export const CHAT_CONTEXT_SELECT = [
  ...HOT_FIELDS,
  "genome",
  "self_model",
  "self_name",
  "gen_level",
  "hidden_emotions",
  "fragments",
].join(", ");

/** Select string for vitality processing (minimal). */
export const VITALITY_SELECT = "vitality, config, status, vitality_processed_at";

/** Select string for voice update. */
export const VOICE_SELECT = "mood, hidden_emotions, voice_params, visual, genome, config, self_model, gen_level, vitality";
