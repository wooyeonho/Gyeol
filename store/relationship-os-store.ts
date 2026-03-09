import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import {
  buildBriefing,
  createInitialSnapshot,
  decideApproval,
  ensureDerivedSnapshot,
  getOpenLoopCount,
  ingestCapture,
  listPriorityPromises,
  runAutonomousEvolutionCycle,
  snoozePromise,
  togglePromise,
} from "@/lib/relationship-os/engine";
import type { CaptureSource, RelationshipBriefing, RelationshipOSSnapshot } from "@/lib/relationship-os/types";

type RelationshipOSState = RelationshipOSSnapshot & {
  hasHydrated: boolean;
  markHydrated: (value: boolean) => void;
  replaceSnapshot: (snapshot: RelationshipOSSnapshot) => void;
  reset: () => void;
  addCapture: (rawText: string, source?: CaptureSource) => void;
  togglePromiseDone: (promiseId: string) => void;
  snoozePromiseById: (promiseId: string) => void;
  approveItem: (approvalId: string) => void;
  dismissItem: (approvalId: string) => void;
  runAutonomousCycle: () => void;
  briefing: () => RelationshipBriefing;
  openLoopCount: (profileId: string) => number;
  priorityTitles: () => string[];
};

const initialSnapshot = createInitialSnapshot();

export const useRelationshipOsStore = create<RelationshipOSState>()(
  persist(
    (set, get) => ({
      ...initialSnapshot,
      hasHydrated: false,
      markHydrated: (value) => set({ hasHydrated: value }),
      replaceSnapshot: (snapshot) =>
        set((state) => ({
          ...ensureDerivedSnapshot(snapshot),
          hasHydrated: state.hasHydrated,
        })),
      reset: () => set({ ...createInitialSnapshot() }),
      addCapture: (rawText, source) =>
        set((state) => ({
          ...ingestCapture(state, rawText, source),
        })),
      togglePromiseDone: (promiseId) =>
        set((state) => ({
          ...togglePromise(state, promiseId),
        })),
      snoozePromiseById: (promiseId) =>
        set((state) => ({
          ...snoozePromise(state, promiseId),
        })),
      approveItem: (approvalId) =>
        set((state) => ({
          ...decideApproval(state, approvalId, "approved"),
        })),
      dismissItem: (approvalId) =>
        set((state) => ({
          ...decideApproval(state, approvalId, "dismissed"),
        })),
      runAutonomousCycle: () =>
        set((state) => ({
          ...runAutonomousEvolutionCycle(state),
        })),
      briefing: () => buildBriefing(get()),
      openLoopCount: (profileId) => getOpenLoopCount(get(), profileId),
      priorityTitles: () => listPriorityPromises(get()).map((item) => item.title),
    }),
    {
      name: "gyeol-relationship-os-v2",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        profiles: state.profiles,
        promises: state.promises,
        approvals: state.approvals,
        captures: state.captures,
        stories: state.stories,
        quests: state.quests,
        autonomousMode: state.autonomousMode,
      }),
      onRehydrateStorage: () => (state) => {
        state?.markHydrated(true);
      },
    },
  ),
);
