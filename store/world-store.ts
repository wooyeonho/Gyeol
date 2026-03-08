import { create } from "zustand";
import { createClient } from "@/lib/supabase/client";

interface WorldStore {
  worldState: { weather?: { name?: string }; [key: string]: unknown } | null;
  fetchWorldState: () => Promise<void>;
}

export const useWorldStore = create<WorldStore>((set) => ({
  worldState: null,
  fetchWorldState: async () => {
    try {
      const supabase = createClient();
      const { data } = await supabase.from("world_state").select("*").eq("id", "global").single();
      set({ worldState: data });
    } catch (e) {
      console.error("[WorldStore] fetchWorldState failed", e);
      set({ worldState: null });
    }
  },
}));
