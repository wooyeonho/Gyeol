/**
 * Circadian rhythm — shifts background color temperature based on local time.
 * Returns subtle tint overlays that blend with the existing identity background.
 *
 * Enhanced with ambient-sky gradients from the world-class design playbook
 * (Apple Weather-style time-of-day background tints).
 */

import {
  ambientSkyTint,
  timeOfDayFromDate,
  type TimeOfDay,
} from "@/lib/design/world-class-playbook";

type CircadianPhase = "dawn" | "morning" | "afternoon" | "dusk" | "night" | "late-night";

function getPhase(hour: number): CircadianPhase {
  if (hour >= 5 && hour < 7) return "dawn";
  if (hour >= 7 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 20) return "dusk";
  if (hour >= 20 && hour < 24) return "night";
  return "late-night";
}

const PHASE_TINTS: Record<CircadianPhase, { overlay: string; warmth: number }> = {
  dawn: {
    overlay: "radial-gradient(ellipse at 50% 80%, rgba(255,180,120,0.08) 0%, transparent 60%)",
    warmth: 0.15,
  },
  morning: {
    overlay: "radial-gradient(ellipse at 50% 50%, rgba(180,220,255,0.06) 0%, transparent 60%)",
    warmth: 0.05,
  },
  afternoon: {
    overlay: "radial-gradient(ellipse at 60% 40%, rgba(255,240,200,0.05) 0%, transparent 60%)",
    warmth: 0.08,
  },
  dusk: {
    overlay: "radial-gradient(ellipse at 50% 70%, rgba(255,140,80,0.10) 0%, transparent 60%)",
    warmth: 0.18,
  },
  night: {
    overlay: "radial-gradient(ellipse at 50% 50%, rgba(80,100,180,0.08) 0%, transparent 60%)",
    warmth: -0.05,
  },
  "late-night": {
    overlay: "radial-gradient(ellipse at 50% 60%, rgba(60,40,120,0.10) 0%, transparent 60%)",
    warmth: -0.08,
  },
};

export function getCircadianTint(date: Date = new Date()) {
  const hour = date.getHours();
  const phase = getPhase(hour);
  // Compute the Apple Weather-style ambient sky gradient from the playbook
  const tod: TimeOfDay = timeOfDayFromDate(date);
  const skyGradient = ambientSkyTint(tod);
  return { phase, ...PHASE_TINTS[phase], skyGradient, timeOfDay: tod };
}
