type JsonObject = Record<string, unknown>;

const ALLOWED_CONFIG_KEYS = new Set([
  "dream_enabled",
  "social_enabled",
  "learner_enabled",
  "crawl_enabled",
  "allow_cross_message",
  "recall_count",
]);

export type SafePlan = {
  config_patch?: JsonObject;
  self_model_patch?: JsonObject;
  note?: string;
};

function isObject(value: unknown): value is JsonObject {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function safeScalar(value: unknown): string | number | boolean | null | undefined {
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean" ||
    value === null ||
    typeof value === "undefined"
  ) {
    return value;
  }
  return undefined;
}

export function sanitizeSafePlan(input: unknown): SafePlan {
  if (!isObject(input)) return {};
  const out: SafePlan = {};

  if (isObject(input.config_patch)) {
    const patch: JsonObject = {};
    for (const [key, value] of Object.entries(input.config_patch)) {
      if (!ALLOWED_CONFIG_KEYS.has(key)) continue;
      const scalar = safeScalar(value);
      if (typeof scalar !== "undefined") patch[key] = scalar;
    }
    if (Object.keys(patch).length > 0) out.config_patch = patch;
  }

  if (isObject(input.self_model_patch)) {
    // Restrict to shallow scalar patch for safety.
    const patch: JsonObject = {};
    for (const [key, value] of Object.entries(input.self_model_patch)) {
      const scalar = safeScalar(value);
      if (typeof scalar !== "undefined") patch[key] = scalar;
    }
    if (Object.keys(patch).length > 0) out.self_model_patch = patch;
  }

  if (typeof input.note === "string") {
    out.note = input.note.trim().slice(0, 500);
  }

  return out;
}

export function applySafePlan(
  currentConfig: JsonObject,
  currentSelfModel: JsonObject,
  plan: SafePlan,
): {
  nextConfig: JsonObject;
  nextSelfModel: JsonObject;
  changed: boolean;
  appliedKeys: string[];
} {
  const nextConfig: JsonObject = { ...currentConfig };
  const nextSelfModel: JsonObject = { ...currentSelfModel };
  const appliedKeys: string[] = [];

  if (plan.config_patch) {
    for (const [key, value] of Object.entries(plan.config_patch)) {
      if (nextConfig[key] !== value) {
        nextConfig[key] = value;
        appliedKeys.push(`config.${key}`);
      }
    }
  }

  if (plan.self_model_patch) {
    for (const [key, value] of Object.entries(plan.self_model_patch)) {
      if (nextSelfModel[key] !== value) {
        nextSelfModel[key] = value;
        appliedKeys.push(`self_model.${key}`);
      }
    }
  }

  return {
    nextConfig,
    nextSelfModel,
    changed: appliedKeys.length > 0,
    appliedKeys,
  };
}
