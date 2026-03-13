import { create } from "zustand";

interface WorldStore {
  worldState: { weather?: { name?: string }; [key: string]: unknown } | null;
  fetchWorldState: () => Promise<void>;
}

export const useWorldStore = create<WorldStore>((set) => ({
  worldState: null,
  fetchWorldState: async () => {
    try {
      const res = await fetch("/api/world/state", { cache: "no-store" });
      const json = await res.json().catch(() => ({ worldState: null }));
      set({ worldState: (json.worldState as { weather?: { name?: string } } | null) ?? null });
    } catch (e) {
      console.error("[WorldStore] fetchWorldState failed", e);
      set({ worldState: null });
    }
  },
}));
