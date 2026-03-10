import { create } from "zustand";

interface AgentStore {
  agentId: string | null;
  agentState: Record<string, unknown> | null;
  loading: boolean;
  evolutionEvent: { level: number; mutation?: string } | null;
  fetchAgentState: (options?: { silent?: boolean }) => Promise<void>;
  triggerEvolution: (event: { level: number; mutation?: string }) => void;
  clearEvolution: () => void;
}

export const useAgentStore = create<AgentStore>((set) => ({
  agentId: null, agentState: null, loading: true, evolutionEvent: null,
  fetchAgentState: async (options) => {
    try {
      if (!options?.silent) set({ loading: true });
      const res = await fetch("/api/agent/state", { cache: "no-store" });
      if (res.status === 401) {
        set({ loading: false, agentId: null, agentState: null });
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
      });
    } catch (e) {
      console.error("[AgentStore] fetchAgentState failed", e);
      set({ loading: false, agentId: null, agentState: null });
    }
  },
  triggerEvolution: (event) => set({ evolutionEvent: event }),
  clearEvolution: () => set({ evolutionEvent: null }),
}));
