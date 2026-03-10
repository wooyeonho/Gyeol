import { create } from "zustand";
import { createClient } from "@/lib/supabase/client";

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
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { set({ loading: false, agentId: null, agentState: null }); return; }

      let { data: agent } = await supabase.from("agents").select("id").eq("user_id", user.id).single();
      if (!agent) {
        const { data: newAgent } = await supabase.from("agents").insert({ user_id: user.id }).select("id").single();
        agent = newAgent;
        if (agent) {
          await supabase.from("agent_state").insert({ agent_id: agent.id });
        }
      }

      if (!agent) { set({ loading: false, agentId: null, agentState: null }); return; }
      const { data: state } = await supabase.from("agent_state").select("*").eq("agent_id", agent.id).single();
      set({ agentId: agent.id, agentState: state, loading: false });
    } catch (e) {
      console.error("[AgentStore] fetchAgentState failed", e);
      set({ loading: false, agentId: null, agentState: null });
    }
  },
  triggerEvolution: (event) => set({ evolutionEvent: event }),
  clearEvolution: () => set({ evolutionEvent: null }),
}));
