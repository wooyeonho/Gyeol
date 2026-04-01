import { appendAssistantContentFromDataLine } from "@/lib/ai/sse-parser";

/**
 * Creates a TransformStream that taps the AI response stream to capture the
 * full assistant text. The captured text is returned via a promise that
 * resolves when the stream completes — but the stream itself is NOT blocked
 * by `onComplete`. Heavy post-processing should run inside Next.js `after()`.
 */
export function createAssistantTapStream(onComplete: (assistantText: string) => void) {
  const decoder = new TextDecoder();
  let buffer = "";
  let fullResponse = "";

  return new TransformStream<Uint8Array, Uint8Array>({
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
      onComplete(fullResponse);
    },
  });
}
