import { describe, it, expect, beforeEach, vi } from "vitest";
import { useAgentStore } from "./agent-store";

describe("agent-store", () => {
  beforeEach(() => {
    // Reset store before each test
    useAgentStore.setState({
      agentId: null,
      agentState: null,
      loading: true,
      evolutionEvent: null,
    });
    vi.resetAllMocks();
  });

  it("should initialize with default state", () => {
    const state = useAgentStore.getState();
    expect(state.agentId).toBeNull();
    expect(state.agentState).toBeNull();
    expect(state.loading).toBe(true);
    expect(state.evolutionEvent).toBeNull();
  });

  it("should update evolution event correctly", () => {
    const store = useAgentStore.getState();
    
    store.triggerEvolution({ level: 2, mutation: "wings" });
    expect(useAgentStore.getState().evolutionEvent).toEqual({ level: 2, mutation: "wings" });

    store.clearEvolution();
    expect(useAgentStore.getState().evolutionEvent).toBeNull();
  });

  it("should handle successful fetchAgentState", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({ agentId: "123", agentState: { mood: "happy" } }),
    });

    const store = useAgentStore.getState();
    await store.fetchAgentState();

    const newState = useAgentStore.getState();
    expect(newState.loading).toBe(false);
    expect(newState.agentId).toBe("123");
    expect(newState.agentState).toEqual({ mood: "happy" });
  });

  it("should handle 401 unauthorized fetchAgentState", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
    });

    const store = useAgentStore.getState();
    // Pre-fill state to verify it gets cleared
    useAgentStore.setState({ agentId: "123", agentState: { mood: "happy" } });
    
    await store.fetchAgentState();

    const newState = useAgentStore.getState();
    expect(newState.loading).toBe(false);
    expect(newState.agentId).toBeNull();
    expect(newState.agentState).toBeNull();
  });

  it("should handle failed fetchAgentState exceptions", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network Error"));

    const store = useAgentStore.getState();
    await store.fetchAgentState();

    const newState = useAgentStore.getState();
    expect(newState.loading).toBe(false);
    expect(newState.agentId).toBeNull();
    expect(newState.agentState).toBeNull();
  });
});
