/**
 * World-class audio/voice patterns — synthesized from 10+ top audio apps.
 *
 * Source apps (see WORLD_CLASS_APPS_RESEARCH.md §4½.5):
 *   Discord Stage, Clubhouse, Twitter Spaces, Spotify Podcast, Overcast,
 *   Apple Podcasts, Voice Memos, Dolby On, Smule, Airchat.
 *
 * Covers: live stages, silence trimming, smart-speed playback, waveform
 * rendering math, noise gating thresholds. All pure-function utilities.
 */

export type VoicePrinciple = {
  id: string;
  source: string;
  rule: string;
};

export const VOICE_PRINCIPLES: readonly VoicePrinciple[] = [
  {
    id: "live-stage",
    source: "Discord Stage / Clubhouse",
    rule: "A stage has explicit speaker vs audience roles; hand-raise is one-tap.",
  },
  {
    id: "smart-speed",
    source: "Overcast",
    rule: "Shorten silences without changing pitch; aggregate saved time per day.",
  },
  {
    id: "chapter-nav",
    source: "Apple Podcasts",
    rule: "Chapters are always visible on the now-playing surface as tappable tiles.",
  },
  {
    id: "inline-waveform",
    source: "Voice Memos",
    rule: "Waveform renders in the same surface as the transport — no separate editor.",
  },
  {
    id: "noise-gate",
    source: "Dolby On",
    rule: "Gate background noise above a threshold; never aggressively compress voice itself.",
  },
  {
    id: "session-bookmark",
    source: "Audible / Spotify",
    rule: "Bookmarks are timestamped and annotatable; sync across devices within 2s.",
  },
  {
    id: "reaction-emoji",
    source: "Twitter Spaces",
    rule: "Listeners can react with floating emoji that float up and dissolve.",
  },
  {
    id: "duet",
    source: "Smule",
    rule: "Two audio tracks can be aligned to a shared beat grid for duet playback.",
  },
  {
    id: "voice-first-feed",
    source: "Airchat",
    rule: "Feed posts can be voice-first with auto-generated transcripts below.",
  },
  {
    id: "silence-trim",
    source: "Overcast / Descript",
    rule: "Auto-detect >500ms of silence and collapse to 150ms when 'smart-speed' is on.",
  },
] as const;

/* ── Smart-speed calculator ───────────────────────────────────────────── */

/**
 * Given raw duration + detected silence ms, return the shortened duration
 * under Overcast-style smart-speed rules.
 */
export function smartSpeedDuration(
  rawDurationSec: number,
  silenceMs: number,
  collapsedSilenceRatio = 0.3,
): number {
  const keptSilenceMs = silenceMs * collapsedSilenceRatio;
  const saved = (silenceMs - keptSilenceMs) / 1000;
  return Math.max(0, rawDurationSec - saved);
}

export function savedMsBetween(rawDurationSec: number, smartDurationSec: number): number {
  return Math.max(0, Math.round((rawDurationSec - smartDurationSec) * 1000));
}

/* ── Waveform down-sampling ───────────────────────────────────────────── */

/**
 * Down-sample a dense sample array to `buckets` peak amplitudes — the
 * standard approach used by Voice Memos and Dolby On to draw waveforms.
 */
export function waveformPeaks(samples: readonly number[], buckets: number): number[] {
  if (buckets <= 0 || samples.length === 0) return [];
  const size = Math.max(1, Math.floor(samples.length / buckets));
  const peaks: number[] = [];
  for (let b = 0; b < buckets; b++) {
    const start = b * size;
    const end = b === buckets - 1 ? samples.length : start + size;
    let peak = 0;
    for (let i = start; i < end; i++) {
      const v = Math.abs(samples[i]);
      if (v > peak) peak = v;
    }
    peaks.push(peak);
  }
  return peaks;
}

/* ── Noise gate ───────────────────────────────────────────────────────── */

export type NoiseGateConfig = {
  /** dB below which the signal is attenuated. */
  thresholdDb: number;
  /** Attack time (ms) to open the gate. */
  attackMs: number;
  /** Release time (ms) to close. */
  releaseMs: number;
};

export const DEFAULT_NOISE_GATE: NoiseGateConfig = {
  thresholdDb: -45,
  attackMs: 5,
  releaseMs: 80,
};

export function gateApplies(sampleDb: number, config: NoiseGateConfig): boolean {
  return sampleDb < config.thresholdDb;
}

/* ── Stage roles ──────────────────────────────────────────────────────── */

export type StageRole = "host" | "speaker" | "listener" | "requested";

export function promoteRole(current: StageRole): StageRole {
  switch (current) {
    case "listener":
      return "requested";
    case "requested":
      return "speaker";
    case "speaker":
      return "host";
    case "host":
      return "host";
  }
}

export function demoteRole(current: StageRole): StageRole {
  switch (current) {
    case "host":
      return "speaker";
    case "speaker":
      return "listener";
    case "requested":
      return "listener";
    case "listener":
      return "listener";
  }
}
