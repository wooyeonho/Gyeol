/**
 * Memory Analysis — utilities for the /journey memory dashboard.
 *
 * Provides DNA history tracking, memory timeline grouping,
 * weekly recap generation, and trait emergence history.
 */

import { DNA_AXES, type DNAAxis } from "@/lib/genome/dna";

export interface DNASnapshot {
  date: string; // YYYY-MM-DD
  dna: Record<DNAAxis, number>;
}

export interface MemoryTimelineEntry {
  id: string;
  date: string;
  type: "chat" | "dream" | "social" | "evolution" | "trait" | "diary";
  summary: string;
  mood: string | null;
}

export interface WeeklyRecap {
  weekStart: string;
  weekEnd: string;
  messageCount: number;
  dominantMood: string;
  dnaChanges: { axis: DNAAxis; delta: number }[];
  newTraits: string[];
  highlights: string[];
}

export interface TraitHistory {
  traitId: string;
  traitName: string;
  emergedAt: string;
  dnaSnapshot: Partial<Record<DNAAxis, number>>;
}

/**
 * Group memories by date for timeline display.
 */
export function groupByDate(entries: MemoryTimelineEntry[]): Map<string, MemoryTimelineEntry[]> {
  const grouped = new Map<string, MemoryTimelineEntry[]>();
  for (const entry of entries) {
    const date = entry.date.slice(0, 10);
    const existing = grouped.get(date) || [];
    existing.push(entry);
    grouped.set(date, existing);
  }
  return grouped;
}

/**
 * Calculate DNA axis changes between two snapshots.
 * Returns axes that changed by more than the threshold.
 */
export function calculateDNAChanges(
  before: Record<string, number>,
  after: Record<string, number>,
  threshold: number = 0.01,
): { axis: DNAAxis; delta: number }[] {
  const changes: { axis: DNAAxis; delta: number }[] = [];
  for (const axis of DNA_AXES) {
    const delta = (after[axis] ?? 0.5) - (before[axis] ?? 0.5);
    if (Math.abs(delta) > threshold) {
      changes.push({ axis, delta });
    }
  }
  return changes.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
}

/**
 * Prepare radar chart data from a DNA snapshot.
 * Returns an array of { axis, value, label } for chart rendering.
 */
export function prepareRadarChartData(
  dna: Record<string, number>,
): { axis: string; value: number; label: string }[] {
  return DNA_AXES.map((axis) => ({
    axis,
    value: dna[axis] ?? 0.5,
    label: axis,
  }));
}

/**
 * Get the dominant mood from a list of mood strings.
 */
export function getDominantMood(moods: string[]): string {
  if (moods.length === 0) return "neutral";
  const counts: Record<string, number> = {};
  for (const m of moods) {
    counts[m] = (counts[m] || 0) + 1;
  }
  let max = 0;
  let dominant = "neutral";
  for (const [mood, count] of Object.entries(counts)) {
    if (count > max) {
      max = count;
      dominant = mood;
    }
  }
  return dominant;
}

/**
 * Format a DNA delta for display (e.g., "+0.05" or "-0.03").
 */
export function formatDelta(delta: number): string {
  const sign = delta >= 0 ? "+" : "";
  return `${sign}${delta.toFixed(3)}`;
}

/**
 * Number of days to show in the journey timeline by default.
 */
export const DEFAULT_TIMELINE_DAYS = 30;

/**
 * Minimum entries needed to show a weekly recap.
 */
export const MIN_RECAP_ENTRIES = 3;
