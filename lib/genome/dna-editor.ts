/**
 * DNA Slider Editor — user-controlled DNA axis adjustments.
 *
 * Users can manually tweak their creature's 16 DNA axes via sliders.
 * Each adjustment costs coins. Changes are applied as soft mutations
 * with real-time 3D preview before committing.
 */

import { DNA_AXES, type CreatureDNA, type DNAAxis } from "@/lib/genome/dna";

/**
 * Cost per DNA point adjustment (0.01 = 1 point).
 * Moving an axis by 0.10 costs 10 * COST_PER_POINT = coins.
 */
export const COST_PER_POINT = 2;

/**
 * Minimum adjustment step for sliders.
 */
export const SLIDER_STEP = 0.01;

/**
 * Maximum single-session adjustment per axis.
 * Prevents extreme changes in one go.
 */
export const MAX_ADJUSTMENT_PER_AXIS = 0.15;

/**
 * Calculate the coin cost for a set of DNA adjustments.
 */
export function calculateEditCost(
  original: CreatureDNA,
  edited: CreatureDNA,
): number {
  let totalPoints = 0;
  for (const axis of DNA_AXES) {
    const delta = Math.abs(edited[axis] - original[axis]);
    totalPoints += Math.round(delta * 100); // each 0.01 = 1 point
  }
  return totalPoints * COST_PER_POINT;
}

/**
 * Validate that edits are within allowed range.
 */
export function validateEdits(
  original: CreatureDNA,
  edited: CreatureDNA,
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  for (const axis of DNA_AXES) {
    const delta = Math.abs(edited[axis] - original[axis]);
    if (delta > MAX_ADJUSTMENT_PER_AXIS + 0.001) {
      errors.push(`${axis}: adjustment ${delta.toFixed(3)} exceeds max ${MAX_ADJUSTMENT_PER_AXIS}`);
    }
    if (edited[axis] < 0 || edited[axis] > 1) {
      errors.push(`${axis}: value ${edited[axis]} out of range [0, 1]`);
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Apply user edits to DNA, returning the new DNA and a change summary.
 */
export function applyDNAEdits(
  original: CreatureDNA,
  edits: Partial<Record<DNAAxis, number>>,
): { dna: CreatureDNA; changedAxes: DNAAxis[]; totalDelta: number } {
  const newDna = { ...original } as Record<string, number>;
  const changedAxes: DNAAxis[] = [];
  let totalDelta = 0;

  for (const [axis, targetValue] of Object.entries(edits)) {
    if (!DNA_AXES.includes(axis as DNAAxis)) continue;
    const typedAxis = axis as DNAAxis;
    const clamped = Math.max(0, Math.min(1, targetValue as number));
    const delta = Math.abs(clamped - original[typedAxis]);

    if (delta > 0.005) {
      // Enforce max adjustment
      const maxDelta = MAX_ADJUSTMENT_PER_AXIS;
      const direction = clamped > original[typedAxis] ? 1 : -1;
      const actualDelta = Math.min(delta, maxDelta);
      newDna[typedAxis] = original[typedAxis] + direction * actualDelta;
      newDna[typedAxis] = Math.max(0, Math.min(1, newDna[typedAxis]));

      changedAxes.push(typedAxis);
      totalDelta += actualDelta;
    }
  }

  return {
    dna: newDna as unknown as CreatureDNA,
    changedAxes,
    totalDelta,
  };
}

/**
 * Get axis category for grouping in the editor UI.
 */
export function getAxisCategory(axis: DNAAxis): "cognitive" | "emotional" | "social" | "meta" {
  if (["analytical", "intuitive", "verbal", "spatial"].includes(axis)) return "cognitive";
  if (["warmth", "intensity", "stability", "openness"].includes(axis)) return "emotional";
  if (["assertiveness", "empathy", "playfulness", "independence"].includes(axis)) return "social";
  return "meta";
}

/**
 * Get all axes grouped by category.
 */
export function getGroupedAxes(): Record<string, DNAAxis[]> {
  const groups: Record<string, DNAAxis[]> = {
    cognitive: [],
    emotional: [],
    social: [],
    meta: [],
  };
  for (const axis of DNA_AXES) {
    groups[getAxisCategory(axis)].push(axis);
  }
  return groups;
}
