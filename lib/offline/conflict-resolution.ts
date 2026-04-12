/**
 * Conflict Resolution — handles sync conflicts between local and server state.
 *
 * Strategies:
 * - last-write-wins: Server timestamp wins
 * - client-wins: Local changes always override
 * - merge: Field-level merge (non-destructive)
 */

export type ConflictStrategy = "last-write-wins" | "client-wins" | "merge";

export interface ConflictInfo {
  table: string;
  key: string;
  localData: Record<string, unknown>;
  serverData: Record<string, unknown>;
  localTimestamp: number;
  serverTimestamp: number;
}

export interface ResolutionResult {
  resolved: Record<string, unknown>;
  strategy: ConflictStrategy;
  fieldsFromLocal: string[];
  fieldsFromServer: string[];
}

/**
 * Resolve a conflict between local and server data.
 */
export function resolveConflict(
  conflict: ConflictInfo,
  strategy: ConflictStrategy = "last-write-wins",
): ResolutionResult {
  switch (strategy) {
    case "client-wins":
      return {
        resolved: { ...conflict.serverData, ...conflict.localData },
        strategy,
        fieldsFromLocal: Object.keys(conflict.localData),
        fieldsFromServer: [],
      };

    case "merge":
      return mergeFields(conflict);

    case "last-write-wins":
    default:
      if (conflict.localTimestamp > conflict.serverTimestamp) {
        return {
          resolved: { ...conflict.serverData, ...conflict.localData },
          strategy,
          fieldsFromLocal: Object.keys(conflict.localData),
          fieldsFromServer: [],
        };
      }
      return {
        resolved: { ...conflict.localData, ...conflict.serverData },
        strategy,
        fieldsFromLocal: [],
        fieldsFromServer: Object.keys(conflict.serverData),
      };
  }
}

/**
 * Field-level merge: keep non-conflicting fields from both sides.
 * For conflicting fields, prefer the more recent value.
 */
function mergeFields(conflict: ConflictInfo): ResolutionResult {
  const resolved: Record<string, unknown> = {};
  const fieldsFromLocal: string[] = [];
  const fieldsFromServer: string[] = [];

  const allKeys = new Set([
    ...Object.keys(conflict.localData),
    ...Object.keys(conflict.serverData),
  ]);

  for (const key of allKeys) {
    const localVal = conflict.localData[key];
    const serverVal = conflict.serverData[key];

    if (localVal === undefined) {
      resolved[key] = serverVal;
      fieldsFromServer.push(key);
    } else if (serverVal === undefined) {
      resolved[key] = localVal;
      fieldsFromLocal.push(key);
    } else if (JSON.stringify(localVal) === JSON.stringify(serverVal)) {
      // Same value — no conflict
      resolved[key] = localVal;
    } else {
      // Real conflict — use timestamp to decide
      if (conflict.localTimestamp > conflict.serverTimestamp) {
        resolved[key] = localVal;
        fieldsFromLocal.push(key);
      } else {
        resolved[key] = serverVal;
        fieldsFromServer.push(key);
      }
    }
  }

  return { resolved, strategy: "merge", fieldsFromLocal, fieldsFromServer };
}

/**
 * Determine the best strategy based on the table.
 */
export function getDefaultStrategy(table: string): ConflictStrategy {
  // User preferences should always use client-wins (user's intent)
  if (table === "user_settings" || table === "preferences") return "client-wins";
  // Chat messages: merge to avoid data loss
  if (table === "messages" || table === "narrative_history") return "merge";
  // Everything else: last-write-wins
  return "last-write-wins";
}
