/**
 * Offline Care — IndexedDB-backed local care state management.
 *
 * Allows the creature's gauges to keep ticking when the network is unavailable.
 * Uses lib/offline/indexed-store.ts as the persistence layer.
 *
 * Key schema:
 *   care:{agentId}       — serialized CareState
 *   care_queue:{agentId} — serialized QueueEntry[]
 */

import { setItem, getItem } from "@/lib/offline/indexed-store";
import { applyCareDecay, petCreature, type CareState, type DecayDNA } from "@/lib/creature/care-loop";

export type { CareState, DecayDNA };

interface QueueEntry {
  action: string;
  timestamp: string;
}

const CARE_KEY = (agentId: string) => `care:${agentId}`;
const QUEUE_KEY = (agentId: string) => `care_queue:${agentId}`;

/** Read the locally stored care state for a creature. Returns null if not found. */
export async function getLocalCareState(agentId: string): Promise<CareState | null> {
  try {
    const record = await getItem(CARE_KEY(agentId));
    if (!record) return null;
    return record as CareState;
  } catch {
    return null;
  }
}

/** Persist care state to IndexedDB. TTL = 7 days (state is valid as long as stored). */
export async function setLocalCareState(agentId: string, state: CareState): Promise<void> {
  try {
    await setItem(CARE_KEY(agentId), state, 7 * 24 * 3600 * 1000);
  } catch {
    // Non-fatal — IndexedDB may be unavailable (private browsing)
  }
}

/** Queue a care action for later server sync. */
export async function queueCareAction(agentId: string, action: string): Promise<void> {
  try {
    const existing = await getPendingCareActions(agentId);
    const entry: QueueEntry = { action, timestamp: new Date().toISOString() };
    await setItem(QUEUE_KEY(agentId), [...existing, entry]);
  } catch {/* non-fatal */}
}

/** Read all pending (unsynced) care actions. */
export async function getPendingCareActions(agentId: string): Promise<QueueEntry[]> {
  try {
    const queue = await getItem(QUEUE_KEY(agentId));
    if (!Array.isArray(queue)) return [];
    return queue as QueueEntry[];
  } catch {
    return [];
  }
}

/** Clear the entire pending queue after a successful server sync. */
export async function clearCareQueue(agentId: string): Promise<void> {
  try {
    await setItem(QUEUE_KEY(agentId), []);
  } catch {/* non-fatal */}
}

/**
 * Apply time-based decay locally using DNA-aware rates.
 * Thin wrapper around care-loop.applyCareDecay to avoid duplicating logic.
 */
export function computeLocalDecay(state: CareState, dna?: DecayDNA): CareState {
  return applyCareDecay(state, dna);
}

/**
 * Apply a petting boost locally (used when offline).
 */
export function applyLocalPet(state: CareState, affinityDelta: number): CareState {
  return petCreature(state, affinityDelta);
}
