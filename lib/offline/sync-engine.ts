/**
 * Offline-First Sync Engine — bidirectional sync with conflict resolution.
 *
 * Inspired by Notion/Linear offline capabilities.
 * Queues mutations while offline, syncs when connection restores.
 */

export type SyncStatus = "synced" | "pending" | "conflict" | "error";

export interface SyncOperation {
  id: string;
  table: string;
  type: "insert" | "update" | "delete";
  data: Record<string, unknown>;
  timestamp: number;
  status: SyncStatus;
  retryCount: number;
  conflictData?: Record<string, unknown>;
}

export interface SyncState {
  lastSyncAt: number;
  pendingOps: SyncOperation[];
  isOnline: boolean;
  isSyncing: boolean;
}

const MAX_RETRIES = 3;
const SYNC_DEBOUNCE_MS = 2000;

/**
 * Create initial sync state.
 */
export function createSyncState(): SyncState {
  return {
    lastSyncAt: 0,
    pendingOps: [],
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    isSyncing: false,
  };
}

/**
 * Queue a mutation for sync.
 */
export function queueOperation(
  state: SyncState,
  table: string,
  type: SyncOperation["type"],
  data: Record<string, unknown>,
): SyncState {
  const op: SyncOperation = {
    id: `op_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    table,
    type,
    data,
    timestamp: Date.now(),
    status: "pending",
    retryCount: 0,
  };

  return {
    ...state,
    pendingOps: [...state.pendingOps, op],
  };
}

/**
 * Mark an operation as synced.
 */
export function markSynced(state: SyncState, opId: string): SyncState {
  return {
    ...state,
    pendingOps: state.pendingOps.map((op) =>
      op.id === opId ? { ...op, status: "synced" as SyncStatus } : op,
    ),
  };
}

/**
 * Mark an operation as having a conflict.
 */
export function markConflict(
  state: SyncState,
  opId: string,
  serverData: Record<string, unknown>,
): SyncState {
  return {
    ...state,
    pendingOps: state.pendingOps.map((op) =>
      op.id === opId
        ? { ...op, status: "conflict" as SyncStatus, conflictData: serverData }
        : op,
    ),
  };
}

/**
 * Remove synced operations from the queue.
 */
export function pruneSynced(state: SyncState): SyncState {
  return {
    ...state,
    pendingOps: state.pendingOps.filter((op) => op.status !== "synced"),
    lastSyncAt: Date.now(),
  };
}

/**
 * Get pending operations ready for sync (sorted by timestamp).
 */
export function getPendingOps(state: SyncState): SyncOperation[] {
  return state.pendingOps
    .filter((op) => op.status === "pending" && op.retryCount < MAX_RETRIES)
    .sort((a, b) => a.timestamp - b.timestamp);
}

/**
 * Increment retry count for a failed operation.
 */
export function incrementRetry(state: SyncState, opId: string): SyncState {
  return {
    ...state,
    pendingOps: state.pendingOps.map((op) => {
      if (op.id !== opId) return op;
      const newRetry = op.retryCount + 1;
      return {
        ...op,
        retryCount: newRetry,
        status: newRetry >= MAX_RETRIES ? ("error" as SyncStatus) : op.status,
      };
    }),
  };
}

/**
 * Check if there are operations to sync.
 */
export function hasPendingSync(state: SyncState): boolean {
  return state.pendingOps.some((op) => op.status === "pending");
}

export { SYNC_DEBOUNCE_MS, MAX_RETRIES };
