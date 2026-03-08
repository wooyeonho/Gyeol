import { createServiceClient } from "@/lib/supabase/service";
import { generateTextOnce } from "@/lib/ai/router";

const REPEAT_TASK_PHRASES = [
  "check the weather",
  "weather",
  "what time",
  "time now",
  "news",
  "repeat",
  "every time",
];

function simpleHash(s: string): string {
  let h = 0;
  for (let i = 0; i < s.length; i++) {
    h = (h << 5) - h + s.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h).toString(36);
}

export async function attemptSelfModification(agentId: string): Promise<void> {
  const service = createServiceClient();
  const { data: stateRow } = await service.from("agent_state").select("total_messages, sandbox").eq("agent_id", agentId).single();
  if (!stateRow) return;

  const totalMessages = Number((stateRow as { total_messages?: number }).total_messages) ?? 0;
  if (totalMessages < 50) return;

  const sandbox = ((stateRow as { sandbox?: { created_tools?: { name: string; code_hash: string }[] } }).sandbox ?? {}) as {
    created_tools?: { name: string; description: string; code_hash: string; created_at: string }[];
  };
  const createdTools = Array.isArray(sandbox.created_tools) ? sandbox.created_tools : [];

  const { data: recentChats } = await service
    .from("chats")
    .select("content")
    .eq("agent_id", agentId)
    .eq("role", "user")
    .order("created_at", { ascending: false })
    .limit(30);
  const userText = (recentChats ?? []).map((r) => (r as { content?: string }).content ?? "").join(" ").toLowerCase();

  let task: string | null = null;
  for (const phrase of REPEAT_TASK_PHRASES) {
    if (userText.includes(phrase)) {
      task = phrase === "weather" ? "get current weather" : phrase === "news" ? "fetch top news headlines" : "get current time";
      break;
    }
  }
  if (!task) return;

  const code = await generateTextOnce(
    "You are a code generator. Output ONLY code, no explanation. Use JavaScript or Python. Simple and safe.",
    `Write a simple function that: ${task}. Output only the function code, no markdown.`,
    { max_tokens: 300, temperature: 0.3 }
  );
  if (!code?.trim()) return;

  const codeHash = simpleHash(code.trim());
  const existing = createdTools.some((t) => t.code_hash === codeHash);
  if (existing) return;

  const name = `tool_${task.replace(/\s+/g, "_").slice(0, 20)}_${codeHash.slice(0, 6)}`;
  const newTool = {
    name,
    description: task,
    code_hash: codeHash,
    created_at: new Date().toISOString(),
  };
  const updatedTools = [...createdTools, newTool];

  await service
    .from("agent_state")
    .update({ sandbox: { ...sandbox, created_tools: updatedTools } })
    .eq("agent_id", agentId);

  await service.from("autonomous_logs").insert({
    agent_id: agentId,
    action_type: "self_modification",
    summary: `Created tool: ${name}`,
  });
}
