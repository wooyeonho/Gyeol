import { appendAssistantContentFromDataLine } from "@/lib/ai/sse-parser";

export function createAssistantTapStream(onComplete: (assistantText: string) => Promise<void>) {
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
    async flush() {
      buffer += decoder.decode();
      for (const rawLine of buffer.split("\n")) {
        const line = rawLine.trim();
        if (line.startsWith("data: ")) {
          fullResponse = appendAssistantContentFromDataLine(line, fullResponse);
        }
      }
      await onComplete(fullResponse);
    },
  });
}
