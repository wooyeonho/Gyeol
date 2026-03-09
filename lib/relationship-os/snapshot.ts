import { createInitialSnapshot, ensureDerivedSnapshot } from "@/lib/relationship-os/engine";
import type { RelationshipOSSnapshot } from "@/lib/relationship-os/types";

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

export function getSnapshotTimestamp(snapshot: RelationshipOSSnapshot): number {
  const candidates = [
    snapshot.autonomousMode?.lastRunAt,
    snapshot.stories[0]?.createdAt,
    snapshot.captures[0]?.createdAt,
    snapshot.approvals[0]?.createdAt,
  ]
    .filter((value): value is string => typeof value === "string")
    .map((value) => new Date(value).getTime())
    .filter((value) => !Number.isNaN(value));
  return candidates.length > 0 ? Math.max(...candidates) : 0;
}

export function isIncomingSnapshotNewer(current: RelationshipOSSnapshot, incoming: RelationshipOSSnapshot): boolean {
  return getSnapshotTimestamp(incoming) > getSnapshotTimestamp(current);
}

export function normalizeRelationshipSnapshot(raw: unknown): RelationshipOSSnapshot {
  const seed = createInitialSnapshot();
  if (!isObject(raw)) return seed;

  const next: RelationshipOSSnapshot = {
    profiles: Array.isArray(raw.profiles) ? raw.profiles : seed.profiles,
    promises: Array.isArray(raw.promises) ? raw.promises : seed.promises,
    approvals: Array.isArray(raw.approvals) ? raw.approvals : seed.approvals,
    captures: Array.isArray(raw.captures) ? raw.captures : seed.captures,
    stories: Array.isArray(raw.stories) ? raw.stories : seed.stories,
    quests: Array.isArray(raw.quests) ? raw.quests : seed.quests,
    autonomousMode:
      isObject(raw.autonomousMode)
        ? {
            ...seed.autonomousMode,
            ...raw.autonomousMode,
          }
        : seed.autonomousMode,
  };

  return ensureDerivedSnapshot(next);
}
