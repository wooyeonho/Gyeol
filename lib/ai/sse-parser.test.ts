import { describe, expect, it } from "vitest";
import { readSseAssistantText } from "./sse-parser";

function makeStream(chunks: string[]): ReadableStream<Uint8Array> {
  const encoder = new TextEncoder();
  return new ReadableStream<Uint8Array>({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });
}

describe("readSseAssistantText", () => {
  it("collects assistant content from SSE lines", async () => {
    const stream = makeStream([
      'data: {"choices":[{"delta":{"content":"안녕"}}]}\n',
      'data: {"choices":[{"delta":{"content":" 하세"}}]}\n',
      'data: {"choices":[{"delta":{"content":"요"}}]}\n',
      "data: [DONE]\n",
    ]);

    const text = await readSseAssistantText(stream);
    expect(text).toBe("안녕 하세요");
  });

  it("handles chunk boundaries splitting json", async () => {
    const stream = makeStream([
      'data: {"choices":[{"delta":{"content":"hel',
      'lo"}}]}\n',
      'data: {"choices":[{"delta":{"content":" world"}}]}\n',
      "data: [DONE]\n",
    ]);

    const text = await readSseAssistantText(stream);
    expect(text).toBe("hello world");
  });
});
