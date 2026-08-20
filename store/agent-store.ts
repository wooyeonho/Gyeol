import { create } from "zustand";
import type { AgentState } from "@/types/agent";
import type { CreatureDNA } from "@/lib/genome/dna";

export interface EngagementSnapshot {
  currentStreak: number;
  longestStreak: number;
  lastActivityDate: string | null;
  shieldCount: number;
  totalXp: number;
  level: number;
  xpIntoLevel: number;
  xpForNext: number;
}

interface AgentStore {
  agentId: string | null;
  agentState: AgentState | null;
  engagement: EngagementSnapshot | null;
  planTier: "free" | "pro" | "premium";
  loading: boolean;
  error: boolean;
  evolutionEvent: { level: number; mutation?: string } | null;
  fetchAgentState: (options?: { silent?: boolean }) => Promise<void>;
  triggerEvolution: (event: { level: number; mutation?: string }) => void;
  clearEvolution: () => void;
  /** Patch only the DNA axes — called by useCreatureDna Realtime subscription. */
  patchDna: (dna: CreatureDNA) => void;
}

const MAX_RETRIES = 2;

export const useAgentStore = create<AgentStore>((set) => ({
  agentId: null, agentState: null, engagement: null, planTier: "free", loading: true, error: false, evolutionEvent: null,
  fetchAgentState: async (options) => {
    if (!options?.silent) set({ loading: true, error: false });
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const res = await fetch("/api/agent/state", { cache: "no-store" });
        if (res.status === 401) {
          set({ loading: false, error: false, agentId: null, agentState: null, engagement: null });
          return;
        }
        if (!res.ok) {
          throw new Error(`Failed to fetch agent state: ${res.status}`);
        }
        const json = await res.json().catch(() => ({ agentId: null, agentState: null }));
        const tier = json.planTier;
        set({
          agentId: typeof json.agentId === "string" ? json.agentId : null,
          agentState: (json.agentState as AgentState | null) ?? null,
          engagement: (json.engagement as EngagementSnapshot | null) ?? null,
          planTier: tier === "pro" || tier === "premium" ? tier : "free",
          loading: false,
          error: false,
        });
        return;
      } catch (e) {
        console.error(`[AgentStore] fetchAgentState attempt ${attempt + 1} failed`, e);
        if (attempt < MAX_RETRIES) {
          const delay = 1000 * Math.pow(2, attempt) + Math.random() * 500;
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }
    set({ loading: false, error: true, agentId: null, agentState: null, engagement: null });
  },
  triggerEvolution: (event) => set({ evolutionEvent: event }),
  clearEvolution: () => set({ evolutionEvent: null }),
  patchDna: (dna) =>
    set((state) => {
      const genome = state.agentState?.genome;
      if (!genome) return {};
      return {
        agentState: {
          ...state.agentState!,
          genome: { ...genome, dna },
        },
      };
    }),
}));
