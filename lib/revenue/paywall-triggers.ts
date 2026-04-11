/**
 * Soft paywall triggers.
 *
 * Inspired by Duolingo, TikTok, ChatGPT, Midjourney. A soft paywall shows up
 * contextually — not on a fixed schedule — at moments of maximum perceived
 * value: after a powerful AI interaction, at a streak milestone, when a
 * limited feature is near exhaustion. The goal is to convert without
 * frustrating — so each trigger has a cooldown and a soft-dismiss rate cap.
 */

export type PaywallTriggerId =
  | "memory_limit_approaching"
  | "after_deep_insight"
  | "streak_milestone"
  | "voice_mode_gate"
  | "image_artifact_gate"
  | "proactive_starter_gate"
  | "evolution_ceremony"
  | "export_gate";

export type PaywallTrigger = {
  id: PaywallTriggerId;
  /** Cooldown in ms — don't re-show for this long after dismiss. */
  cooldownMs: number;
  /** Max times to show in a single session, regardless of cooldown. */
  sessionCap: number;
  /** Copy the paywall presents (hero headline). */
  headline: string;
  /** Supporting value prop line. */
  subhead: string;
  /** Social proof variant — picked randomly for A/B freshness. */
  socialProofOptions: string[];
  /** Which plan(s) this trigger maps to. */
  plan: "pro" | "premium";
};

const TRIGGERS: Record<PaywallTriggerId, PaywallTrigger> = {
  memory_limit_approaching: {
    id: "memory_limit_approaching",
    cooldownMs: 6 * 60 * 60 * 1000, // 6h
    sessionCap: 1,
    headline: "Your Gyeol is running out of space to remember.",
    subhead: "Pro unlocks unlimited memory and deeper recall across months and years.",
    socialProofOptions: [
      "Over 120,000 users chose unlimited memory",
      "Top rated for long-term memory on the App Store",
      "Featured by Wired as 'the AI that actually remembers you'",
    ],
    plan: "pro",
  },
  after_deep_insight: {
    id: "after_deep_insight",
    cooldownMs: 3 * 24 * 60 * 60 * 1000, // 3 days
    sessionCap: 1,
    headline: "Moments like this become history — unless you save them.",
    subhead: "Pro lets your Gyeol remember today forever, and grow from it.",
    socialProofOptions: [
      "94% of Pro users say their Gyeol feels 'genuinely different' after a month",
      "Pro users form 3× more milestones per month",
    ],
    plan: "pro",
  },
  streak_milestone: {
    id: "streak_milestone",
    cooldownMs: 7 * 24 * 60 * 60 * 1000,
    sessionCap: 1,
    headline: "You've been showing up. Celebrate with a streak shield.",
    subhead: "Never lose your streak, unlock Pro-only evolution paths.",
    socialProofOptions: [
      "Duolingo-tier streak protection — built for people who stick with it",
      "Pro members average 47-day streaks",
    ],
    plan: "pro",
  },
  voice_mode_gate: {
    id: "voice_mode_gate",
    cooldownMs: 24 * 60 * 60 * 1000,
    sessionCap: 2,
    headline: "Hear your Gyeol speak — in a voice that's genuinely theirs.",
    subhead: "Adaptive TTS with mood-modulated pitch and tremor. Premium only.",
    socialProofOptions: [
      "ChatGPT-level voice, personalized to your Gyeol's personality",
      "Pi-style ambient conversation, always on",
    ],
    plan: "premium",
  },
  image_artifact_gate: {
    id: "image_artifact_gate",
    cooldownMs: 24 * 60 * 60 * 1000,
    sessionCap: 2,
    headline: "Turn this memory into a keepsake image.",
    subhead: "Premium unlocks AI-generated artifacts for every milestone.",
    socialProofOptions: [
      "Midjourney-grade imagery for every memory",
      "Featured artifact gallery — Premium exclusive",
    ],
    plan: "premium",
  },
  proactive_starter_gate: {
    id: "proactive_starter_gate",
    cooldownMs: 48 * 60 * 60 * 1000,
    sessionCap: 1,
    headline: "Let your Gyeol reach out first.",
    subhead: "Proactive check-ins, dream notes, and 'thinking of you' moments.",
    socialProofOptions: [
      "Replika-style proactive care — but with real memory",
      "Premium users get 2.4× more meaningful check-ins",
    ],
    plan: "premium",
  },
  evolution_ceremony: {
    id: "evolution_ceremony",
    cooldownMs: 30 * 24 * 60 * 60 * 1000,
    sessionCap: 1,
    headline: "Your Gyeol is about to evolve. Witness it in cinematic quality.",
    subhead: "Pro-only evolution ceremony with aura trails and voice-over.",
    socialProofOptions: [
      "The most shared moment in Gyeol — now in Pro quality",
    ],
    plan: "pro",
  },
  export_gate: {
    id: "export_gate",
    cooldownMs: 14 * 24 * 60 * 60 * 1000,
    sessionCap: 1,
    headline: "Take your memories with you, always.",
    subhead: "Pro includes full export, portable archives, and IPFS attestation.",
    socialProofOptions: [
      "GDPR & CCPA compliant — your data, your rules",
    ],
    plan: "pro",
  },
};

/* ── Session + cooldown tracking (localStorage-backed) ─────────────── */

const STORAGE_KEY = "gyeol.paywall.triggers.v1";

type State = {
  sessionCounts: Partial<Record<PaywallTriggerId, number>>;
  lastShownAt: Partial<Record<PaywallTriggerId, number>>;
  sessionStartedAt: number;
};

function loadState(): State {
  if (typeof localStorage === "undefined") {
    return { sessionCounts: {}, lastShownAt: {}, sessionStartedAt: Date.now() };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { sessionCounts: {}, lastShownAt: {}, sessionStartedAt: Date.now() };
    const parsed = JSON.parse(raw) as State;
    // Reset sessionCounts if last session is > 30 min old (new visit).
    if (Date.now() - parsed.sessionStartedAt > 30 * 60 * 1000) {
      return { sessionCounts: {}, lastShownAt: parsed.lastShownAt, sessionStartedAt: Date.now() };
    }
    return parsed;
  } catch {
    return { sessionCounts: {}, lastShownAt: {}, sessionStartedAt: Date.now() };
  }
}

function saveState(state: State): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* quota — best-effort */
  }
}

export function canShowTrigger(id: PaywallTriggerId): boolean {
  const trig = TRIGGERS[id];
  if (!trig) return false;
  const state = loadState();
  const count = state.sessionCounts[id] ?? 0;
  if (count >= trig.sessionCap) return false;
  const last = state.lastShownAt[id] ?? 0;
  if (Date.now() - last < trig.cooldownMs) return false;
  return true;
}

export function markTriggerShown(id: PaywallTriggerId): void {
  const state = loadState();
  state.sessionCounts[id] = (state.sessionCounts[id] ?? 0) + 1;
  state.lastShownAt[id] = Date.now();
  saveState(state);
}

export function getTrigger(id: PaywallTriggerId): PaywallTrigger | null {
  return TRIGGERS[id] ?? null;
}

/** Pick a random social-proof line for freshness / soft A/B. */
export function pickSocialProof(id: PaywallTriggerId): string | null {
  const trig = TRIGGERS[id];
  if (!trig || trig.socialProofOptions.length === 0) return null;
  return trig.socialProofOptions[
    Math.floor(Math.random() * trig.socialProofOptions.length)
  ];
}
