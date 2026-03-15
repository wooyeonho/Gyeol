import { create } from "zustand";

interface AgentStore {
  agentId: string | null;
  agentState: Record<string, unknown> | null;
  loading: boolean;
  error: boolean;
  evolutionEvent: { level: number; mutation?: string } | null;
  fetchAgentState: (options?: { silent?: boolean }) => Promise<void>;
  triggerEvolution: (event: { level: number; mutation?: string }) => void;
  clearEvolution: () => void;
}

const MAX_RETRIES = 2;
const RETRY_DELAYS = [1000, 3000];

export const useAgentStore = create<AgentStore>((set) => ({
  agentId: null, agentState: null, loading: true, error: false, evolutionEvent: null,
  fetchAgentState: async (options) => {
    if (!options?.silent) set({ loading: true, error: false });
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const res = await fetch("/api/agent/state", { cache: "no-store" });
        if (res.status === 401) {
          set({ loading: false, error: false, agentId: null, agentState: null });
          return;
        }
        if (!res.ok) {
          throw new Error(`Failed to fetch agent state: ${res.status}`);
        }
        const json = await res.json().catch(() => ({ agentId: null, agentState: null }));
        set({
          agentId: typeof json.agentId === "string" ? json.agentId : null,
          agentState: (json.agentState as Record<string, unknown> | null) ?? null,
          loading: false,
          error: false,
        });
        return;
      } catch (e) {
        console.error(`[AgentStore] fetchAgentState attempt ${attempt + 1} failed`, e);
        if (attempt < MAX_RETRIES) {
          await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt]));
        }
      }
    }
    set({ loading: false, error: true, agentId: null, agentState: null });
  },
  triggerEvolution: (event) => set({ evolutionEvent: event }),
  clearEvolution: () => set({ evolutionEvent: null }),
}));
