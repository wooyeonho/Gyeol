import { createInitialCreatureState } from "./initial-state";
import type { CreatureEvent, CreatureState } from "./types";

const STATE_KEY_PREFIX = "gyeol_creature_life_state:";
const EVENT_KEY_PREFIX = "gyeol_creature_life_events:";
const MAX_EVENTS = 300;

function stateKey(id: string) {
  return `${STATE_KEY_PREFIX}${id}`;
}

function eventKey(id: string) {
  return `${EVENT_KEY_PREFIX}${id}`;
}

function canUseStorage() {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

export function loadCreatureState(id: string): CreatureState {
  if (!canUseStorage()) return createInitialCreatureState(id);
  try {
    const raw = window.localStorage.getItem(stateKey(id));
    if (!raw) return createInitialCreatureState(id);
    const parsed = JSON.parse(raw) as CreatureState;
    return parsed?.id === id ? parsed : createInitialCreatureState(id);
  } catch {
    return createInitialCreatureState(id);
  }
}

export function saveCreatureState(state: CreatureState) {
  if (!canUseStorage()) return;
  try {
    window.localStorage.setItem(stateKey(state.id), JSON.stringify(state));
  } catch {
    // Best-effort local creature life persistence.
  }
}

export function loadCreatureEvents(id: string): CreatureEvent[] {
  if (!canUseStorage()) return [];
  try {
    const raw = window.localStorage.getItem(eventKey(id));
    return raw ? (JSON.parse(raw) as CreatureEvent[]) : [];
  } catch {
    return [];
  }
}

export function appendCreatureEvent(id: string, event: CreatureEvent) {
  if (!canUseStorage()) return;
  try {
    const events = [...loadCreatureEvents(id), event].slice(-MAX_EVENTS);
    window.localStorage.setItem(eventKey(id), JSON.stringify(events));
  } catch {
    // Event log is diagnostic; state persistence remains the source of truth locally.
  }
}

export function clearCreatureLife(id: string) {
  if (!canUseStorage()) return;
  try {
    window.localStorage.removeItem(stateKey(id));
    window.localStorage.removeItem(eventKey(id));
  } catch {
    // Ignore storage failures.
  }
}
