import { create } from "zustand";
import { createClient } from "@/lib/supabase/client";

interface WorldStore { worldState: any | null; fetchWorldState: () => Promise<void> }

export const useWorldStore = create<WorldStore>((set) => ({
  worldState: null,
  fetchWorldState: async () => {
    const supabase = createClient();
    const { data } = await supabase.from("world_state").select("*").eq("id", "global").single();
    set({ worldState: data });
  },
}));
