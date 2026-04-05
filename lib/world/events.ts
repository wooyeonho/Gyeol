/**
 * World Events System — shared temporal events that all creatures experience.
 *
 * Events like meteor showers, eclipses, full moons trigger temporary DNA mutations
 * and special creature reactions. All users experience them simultaneously.
 */

import type { DNAAxis } from "@/lib/genome/dna";

export type WorldEventType =
  | "meteor_shower"
  | "eclipse"
  | "full_moon"
  | "aurora"
  | "season_change"
  | "cosmic_storm";

export interface WorldEvent {
  type: WorldEventType;
  startAt: string;  // ISO
  endAt: string;    // ISO
  dnaEffects: Partial<Record<DNAAxis, number>>; // temporary mutations
  moodOverride: string | null;
}

/**
 * Predefined world events with their DNA effects.
 */
const EVENT_TEMPLATES: Record<WorldEventType, {
  durationHours: number;
  dnaEffects: Partial<Record<DNAAxis, number>>;
  moodOverride: string | null;
}> = {
  meteor_shower: {
    durationHours: 4,
    dnaEffects: { curiosity: 0.05, openness: 0.03, creativity: 0.04 },
    moodOverride: "excited",
  },
  eclipse: {
    durationHours: 2,
    dnaEffects: { intuitive: 0.06, stability: -0.03, intensity: 0.04 },
    moodOverride: "dreamy",
  },
  full_moon: {
    durationHours: 8,
    dnaEffects: { empathy: 0.04, warmth: 0.03, playfulness: 0.02 },
    moodOverride: "tender",
  },
  aurora: {
    durationHours: 6,
    dnaEffects: { creativity: 0.05, openness: 0.04, spatial: 0.03 },
    moodOverride: "inspired",
  },
  season_change: {
    durationHours: 24,
    dnaEffects: { adaptability: 0.04, persistence: 0.02 },
    moodOverride: null,
  },
  cosmic_storm: {
    durationHours: 3,
    dnaEffects: { intensity: 0.06, assertiveness: 0.04, stability: -0.04 },
    moodOverride: "energetic",
  },
};

/**
 * Check if a world event should be triggered based on current time.
 * Uses a deterministic schedule based on day-of-year.
 */
export function getScheduledEvent(): WorldEvent | null {
  const now = new Date();
  const dayOfYear = Math.floor((now.getTime() - new Date(now.getFullYear(), 0, 0).getTime()) / 86400000);
  const hour = now.getUTCHours();

  // Schedule events on specific days/hours
  const eventTypes: WorldEventType[] = [
    "meteor_shower", "eclipse", "full_moon",
    "aurora", "season_change", "cosmic_storm",
  ];

  // Meteor shower: every 7 days at 22:00 UTC
  if (dayOfYear % 7 === 0 && hour >= 22) {
    return createEvent("meteor_shower", now);
  }
  // Eclipse: every 14 days at 12:00 UTC
  if (dayOfYear % 14 === 3 && hour >= 12 && hour < 14) {
    return createEvent("eclipse", now);
  }
  // Full moon: every 29 days
  if (dayOfYear % 29 === 0 && hour >= 20) {
    return createEvent("full_moon", now);
  }
  // Aurora: every 10 days at night
  if (dayOfYear % 10 === 5 && hour >= 0 && hour < 6) {
    return createEvent("aurora", now);
  }
  // Season change: equinoxes/solstices (approx)
  if ([79, 172, 266, 355].includes(dayOfYear)) {
    return createEvent("season_change", now);
  }
  // Cosmic storm: every 21 days
  if (dayOfYear % 21 === 10 && hour >= 15 && hour < 18) {
    return createEvent("cosmic_storm", now);
  }

  // Random event: ~5% chance per check
  const seed = dayOfYear * 100 + hour;
  if (seed % 20 === 7) {
    const randomType = eventTypes[seed % eventTypes.length];
    return createEvent(randomType, now);
  }

  return null;
}

function createEvent(type: WorldEventType, now: Date): WorldEvent {
  const template = EVENT_TEMPLATES[type];
  const start = new Date(now);
  const end = new Date(now.getTime() + template.durationHours * 3600000);

  return {
    type,
    startAt: start.toISOString(),
    endAt: end.toISOString(),
    dnaEffects: template.dnaEffects,
    moodOverride: template.moodOverride,
  };
}

/**
 * Check if an event is currently active.
 */
export function isEventActive(event: WorldEvent): boolean {
  const now = Date.now();
  return now >= new Date(event.startAt).getTime() && now <= new Date(event.endAt).getTime();
}

/**
 * Get event display info for i18n.
 */
export function getEventDisplayKey(type: WorldEventType): string {
  return `worldEvent.${type}`;
}

/**
 * Get remaining time for an active event.
 */
export function getEventTimeRemaining(event: WorldEvent): { hours: number; minutes: number } {
  const remaining = Math.max(0, new Date(event.endAt).getTime() - Date.now());
  return {
    hours: Math.floor(remaining / 3600000),
    minutes: Math.floor((remaining % 3600000) / 60000),
  };
}
