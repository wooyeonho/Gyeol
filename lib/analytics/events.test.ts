import { describe, it, expect, vi } from "vitest";
import { PRODUCT_EVENT, recordServerEvent } from "./events";

describe("PRODUCT_EVENT", () => {
  it("has expected event names", () => {
    expect(PRODUCT_EVENT.chatRequestReceived).toBe("chat_request_received");
    expect(PRODUCT_EVENT.chatContextReady).toBe("chat_context_ready");
    expect(PRODUCT_EVENT.chatStreamCompleted).toBe("chat_stream_completed");
    expect(PRODUCT_EVENT.chatPostProcessCompleted).toBe("chat_post_process_completed");
    expect(PRODUCT_EVENT.chatPostProcessFailed).toBe("chat_post_process_failed");
  });
});

describe("recordServerEvent", () => {
  it("logs event with name, payload, and timestamp", () => {
    const spy = vi.spyOn(console, "info").mockImplementation(() => {});
    recordServerEvent(PRODUCT_EVENT.chatRequestReceived, { agentId: "a1" });
    expect(spy).toHaveBeenCalledOnce();
    const logged = JSON.parse(spy.mock.calls[0][1]);
    expect(logged.name).toBe("chat_request_received");
    expect(logged.payload.agentId).toBe("a1");
    expect(logged.timestamp).toBeDefined();
    spy.mockRestore();
  });
});
