import { create } from "zustand";
import { createClient } from "@/lib/supabase/client";

interface AgentStore {
  agentId: string | null;
  agentState: any | null;
  loading: boolean;
  evolutionEvent: { level: number; mutation?: string } | null;
  fetchAgentState: () => Promise<void>;
  triggerEvolution: (event: { level: number; mutation?: string }) => void;
  clearEvolution: () => void;
}

export const useAgentStore = create<AgentStore>((set) => ({
  agentId: null, agentState: null, loading: true, evolutionEvent: null,
  fetchAgentState: async () => {
    set({ loading: true });
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { set({ loading: false }); return; }

    let { data: agent } = await supabase.from("agents").select("id").eq("user_id", user.id).single();
    if (!agent) {
      const { data: newAgent } = await supabase.from("agents").insert({ user_id: user.id }).select("id").single();
      agent = newAgent;
      if (agent) {
        await supabase.from("agent_state").insert({ agent_id: agent.id });
      }
    }

    if (!agent) { set({ loading: false }); return; }
    const { data: state } = await supabase.from("agent_state").select("*").eq("agent_id", agent.id).single();
    set({ agentId: agent.id, agentState: state, loading: false });
  },
  triggerEvolution: (event) => set({ evolutionEvent: event }),
  clearEvolution: () => set({ evolutionEvent: null }),
}));
