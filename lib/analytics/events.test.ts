import { describe, it, expect, vi } from "vitest";

const mockLoggerInfo = vi.fn();
vi.mock("@/lib/logger", () => ({
  logger: {
    info: (...args: unknown[]) => mockLoggerInfo(...args),
    error: vi.fn(),
    warn: vi.fn(),
  },
}));

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
    mockLoggerInfo.mockClear();
    recordServerEvent(PRODUCT_EVENT.chatRequestReceived, { agentId: "a1" });
    expect(mockLoggerInfo).toHaveBeenCalledOnce();
    const [label, logged] = mockLoggerInfo.mock.calls[0];
    expect(label).toBe("ProductEvent");
    expect(logged.name).toBe("chat_request_received");
    expect(logged.payload.agentId).toBe("a1");
    expect(logged.timestamp).toBeDefined();
  });
});
