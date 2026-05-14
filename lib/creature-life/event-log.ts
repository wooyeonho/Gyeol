import type { CreatureEvent } from "./types";

export function createCreatureEvent<T extends CreatureEvent["type"]>(type: T, payload: Omit<Extract<CreatureEvent, { type: T }>, "type" | "at">, at = new Date().toISOString()): Extract<CreatureEvent, { type: T }> {
  return { type, at, ...payload } as Extract<CreatureEvent, { type: T }>;
}
