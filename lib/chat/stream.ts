import { appendAssistantContentFromDataLine } from "@/lib/ai/sse-parser";

/**
 * Tap stream that captures the full assistant response text.
 * flush() is NON-blocking — stream closes immediately.
 * Use `getFullResponse()` to read captured text for inline SSE events.
 */
export function createAssistantTapStream() {
  const decoder = new TextDecoder();
  let buffer = "";
  let fullResponse = "";

  const transform = new TransformStream<Uint8Array, Uint8Array>({
    transform(chunk, controller) {
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";
      for (const rawLine of lines) {
        const line = rawLine.trim();
        if (line.startsWith("data: ")) {
          fullResponse = appendAssistantContentFromDataLine(line, fullResponse);
        }
      }
      controller.enqueue(chunk);
    },
    flush() {
      buffer += decoder.decode();
      for (const rawLine of buffer.split("\n")) {
        const line = rawLine.trim();
        if (line.startsWith("data: ")) {
          fullResponse = appendAssistantContentFromDataLine(line, fullResponse);
        }
      }
      // No await — stream closes immediately
    },
  });

  return {
    transform,
    getFullResponse: () => fullResponse,
  };
}
