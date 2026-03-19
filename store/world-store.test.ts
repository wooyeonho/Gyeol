import { describe, it, expect, vi, beforeEach } from "vitest";
import { useWorldStore } from "./world-store";

describe("useWorldStore", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    useWorldStore.setState({ worldState: null });
  });

  it("initializes with null worldState", () => {
    expect(useWorldStore.getState().worldState).toBeNull();
  });

  it("fetches and sets world state", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ worldState: { weather: { name: "Aurora" } } }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    await useWorldStore.getState().fetchWorldState();
    expect(useWorldStore.getState().worldState).toEqual({ weather: { name: "Aurora" } });
  });

  it("sets null when fetch fails", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});

    await useWorldStore.getState().fetchWorldState();
    expect(useWorldStore.getState().worldState).toBeNull();
    spy.mockRestore();
  });

  it("sets null when response has no worldState", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({}), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );

    await useWorldStore.getState().fetchWorldState();
    expect(useWorldStore.getState().worldState).toBeNull();
  });

  it("handles invalid JSON gracefully", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("not json", { status: 200 })
    );

    await useWorldStore.getState().fetchWorldState();
    expect(useWorldStore.getState().worldState).toBeNull();
  });
});
