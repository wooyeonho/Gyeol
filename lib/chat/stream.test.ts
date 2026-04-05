import { describe, expect, it } from "vitest";
import { createAssistantTapStream } from "./stream";

describe("createAssistantTapStream", () => {
  it("captures assistant content from SSE chunks", async () => {
    const { transform, getFullResponse } = createAssistantTapStream();
    const encoder = new TextEncoder();

    const writer = transform.writable.getWriter();
    const reader = transform.readable.getReader();

    // Drain concurrently to avoid back-pressure deadlock
    const drainPromise = (async () => {
      const chunks: Uint8Array[] = [];
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        chunks.push(value);
      }
      return chunks;
    })();

    await writer.write(encoder.encode('data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n'));
    await writer.write(encoder.encode('data: {"choices":[{"delta":{"content":" world"}}]}\n\n'));
    await writer.write(encoder.encode("data: [DONE]\n\n"));
    await writer.close();

    const chunks = await drainPromise;
    expect(getFullResponse()).toBe("Hello world");
    expect(chunks.length).toBe(3);
  });

  it("returns empty string when no data lines", async () => {
    const { transform, getFullResponse } = createAssistantTapStream();
    const writer = transform.writable.getWriter();
    const reader = transform.readable.getReader();

    const drainPromise = (async () => {
      while (true) {
        const { done } = await reader.read();
        if (done) break;
      }
    })();

    await writer.write(new TextEncoder().encode("event: ping\n\n"));
    await writer.close();

    await drainPromise;
    expect(getFullResponse()).toBe("");
  });

  it("handles partial chunks across multiple writes", async () => {
    const { transform, getFullResponse } = createAssistantTapStream();
    const encoder = new TextEncoder();
    const writer = transform.writable.getWriter();
    const reader = transform.readable.getReader();

    const drainPromise = (async () => {
      while (true) {
        const { done } = await reader.read();
        if (done) break;
      }
    })();

    // Split an SSE line across two chunks
    await writer.write(encoder.encode('data: {"choices":[{"delta":'));
    await writer.write(encoder.encode('{"content":"split"}}]}\n\ndata: [DONE]\n\n'));
    await writer.close();

    await drainPromise;
    expect(getFullResponse()).toBe("split");
  });
});
