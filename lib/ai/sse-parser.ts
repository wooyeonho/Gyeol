type DeltaChunk = { choices?: Array<{ delta?: { content?: string } }> };

function appendContentFromDataLine(line: string, fullText: string): string {
  const payload = line.slice(6).trim();
  if (!payload || payload === "[DONE]") return fullText;
  try {
    const parsed = JSON.parse(payload) as DeltaChunk;
    const content = parsed.choices?.[0]?.delta?.content;
    return typeof content === "string" ? fullText + content : fullText;
  } catch {
    return fullText;
  }
}

export async function readSseAssistantText(stream: ReadableStream<Uint8Array>): Promise<string> {
  const reader = stream.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const rawLine of lines) {
      const line = rawLine.trim();
      if (line.startsWith("data: ")) {
        fullText = appendContentFromDataLine(line, fullText);
      }
    }
  }

  buffer += decoder.decode();
  const tailLines = buffer.split("\n");
  for (const rawLine of tailLines) {
    const line = rawLine.trim();
    if (line.startsWith("data: ")) {
      fullText = appendContentFromDataLine(line, fullText);
    }
  }
  return fullText;
}
