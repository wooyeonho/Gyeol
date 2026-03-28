/**
 * Affinity Tracker — Tamagotchi-style non-chat intimacy system.
 *
 * Tracks non-verbal interactions (watching, touching, ignoring) and
 * converts them into affinity scores that influence intimacy_score.
 *
 * Like Baldur's Gate companion approval: every action has consequences.
 */

export interface AffinitySession {
  /** Total seconds the user has been watching (page visible, not idle) */
  watchSeconds: number;
  /** Number of touch interactions this session */
  touchCount: number;
  /** Cumulative affinity delta from touches */
  touchAffinity: number;
  /** Seconds the creature has been ignored (idle with page visible) */
  ignoreSeconds: number;
  /** Last interaction timestamp */
  lastInteractionAt: number;
  /** Session start timestamp */
  sessionStartAt: number;
}

export function createAffinitySession(): AffinitySession {
  const now = Date.now();
  return {
    watchSeconds: 0,
    touchCount: 0,
    touchAffinity: 0,
    ignoreSeconds: 0,
    lastInteractionAt: now,
    sessionStartAt: now,
  };
}

/**
 * Tick the affinity session — called periodically (e.g. every second).
 * Watching = page visible + recent interaction (< 30s idle)
 * Ignoring = page visible + long idle (> 60s)
 */
export function tickAffinitySession(
  session: AffinitySession,
  dtSeconds: number,
  isPageVisible: boolean,
  idleSeconds: number,
): AffinitySession {
  if (!isPageVisible) return session;

  const isWatching = idleSeconds < 30;
  const isIgnoring = idleSeconds > 60;

  return {
    ...session,
    watchSeconds: session.watchSeconds + (isWatching ? dtSeconds : 0),
    ignoreSeconds: session.ignoreSeconds + (isIgnoring ? dtSeconds : 0),
  };
}

/**
 * Record a touch interaction in the affinity session.
 */
export function recordTouch(
  session: AffinitySession,
  affinityDelta: number,
): AffinitySession {
  return {
    ...session,
    touchCount: session.touchCount + 1,
    touchAffinity: session.touchAffinity + affinityDelta,
    lastInteractionAt: Date.now(),
  };
}

/**
 * Compute the total affinity change for this session.
 * This gets sent to the server to update intimacy_score.
 *
 * Watching: +0.1 per minute (max +3 per session)
 * Touching: variable based on touch type
 * Ignoring: -0.05 per minute (max -1 per session)
 */
export function computeSessionAffinity(session: AffinitySession): number {
  const watchBonus = Math.min(3, (session.watchSeconds / 60) * 0.1);
  const touchBonus = session.touchAffinity;
  const ignorePenalty = Math.max(-1, -(session.ignoreSeconds / 60) * 0.05);

  return watchBonus + touchBonus + ignorePenalty;
}

/**
 * Determine the creature's mood reaction to the current affinity session.
 * Used for real-time visual feedback.
 */
export type AffinityMood =
  | "delighted"   // lots of positive touch
  | "content"     // gentle watching
  | "lonely"      // being ignored
  | "playful"     // frequent taps
  | "neutral";    // default

export function deriveAffinityMood(session: AffinitySession): AffinityMood {
  const recentTouchRate = session.touchCount / Math.max(1, (Date.now() - session.sessionStartAt) / 60000);

  if (session.touchAffinity > 5 && recentTouchRate > 3) return "delighted";
  if (session.touchCount > 10 && session.touchAffinity > 0) return "playful";
  if (session.ignoreSeconds > 120) return "lonely";
  if (session.watchSeconds > 60 && session.touchAffinity >= 0) return "content";
  return "neutral";
}
