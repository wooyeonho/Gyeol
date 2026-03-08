import { create } from "zustand";

type AgentState = Record<string, unknown>;

type PendingEvolution = { level?: number; mutation?: string | null };
type CelebrationPending = { kind?: string; title?: string; subtitle?: string } | null;

type AgentStore = {
  agentId: string | null;
  agentState: AgentState | null;
  loading: boolean;
  evolutionEvent: PendingEvolution | null;
  celebrationEvent: CelebrationPending;
  fetchAgentState: () => Promise<void>;
  clearEvolution: () => Promise<void>;
  clearCelebration: () => Promise<void>;
};

export const useAgentStore = create<AgentStore>((set, get) => ({
  agentId: null,
  agentState: null,
  loading: false,
  evolutionEvent: null,
  celebrationEvent: null,

  async fetchAgentState() {
    set({ loading: true });
    try {
      const res = await fetch("/api/agent/state");
      const data = res.ok ? await res.json() : { agentId: null, agentState: null };
      const state = data.agentState ?? null;
      const pending = (state?.pending_evolution as PendingEvolution | undefined) ?? null;
      const celebration = (state?.celebration_pending as CelebrationPending) ?? null;
      set({
        agentId: data.agentId ?? null,
        agentState: state,
        evolutionEvent: pending,
        celebrationEvent: celebration,
      });
    } catch (e) {
      console.error("fetchAgentState error", e);
    } finally {
      set({ loading: false });
    }
  },

  async clearEvolution() {
    try {
      await fetch("/api/agent/evolution/clear", { method: "POST" });
      const { agentState } = get();
      set({
        evolutionEvent: null,
        agentState: agentState ? { ...agentState, pending_evolution: null } : null,
      });
      await get().fetchAgentState();
    } catch (e) {
      console.error("clearEvolution error", e);
    }
  },

  async clearCelebration() {
    try {
      await fetch("/api/agent/celebration/clear", { method: "POST" });
      const { agentState } = get();
      set({
        celebrationEvent: null,
        agentState: agentState ? { ...agentState, celebration_pending: null } : null,
      });
    } catch (e) {
      console.error("clearCelebration error", e);
    }
  },
}));
