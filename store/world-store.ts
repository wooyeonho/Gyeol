import { create } from "zustand";

type WorldState = { weather?: { name?: string }; [key: string]: unknown };

type WorldStore = {
  worldState: WorldState | null;
  fetchWorldState: () => Promise<void>;
};

export const useWorldStore = create<WorldStore>((set) => ({
  worldState: null,

  async fetchWorldState() {
    try {
      const res = await fetch("/api/world/state");
      const data = res.ok ? await res.json() : null;
      set({ worldState: data?.worldState ?? null });
    } catch (e) {
      console.error("fetchWorldState error", e);
    }
  },
}));
