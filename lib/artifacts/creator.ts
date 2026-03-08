import { createServiceClient } from "@/lib/supabase/service";
import { generateTextOnce } from "@/lib/ai/router";
import { generateEmbedding } from "@/lib/ai/embedding";
import { generateImage } from "@/lib/artifacts/image-gen";
import { generateMusicParams } from "@/lib/artifacts/music-gen";

const FORTY_EIGHT_HOURS = 48 * 60 * 60 * 1000;

export async function generateArtifact(agentId: string): Promise<void> {
  const service = createServiceClient();
  const { data: stateRow } = await service.from("agent_state").select("*").eq("agent_id", agentId).single();
  if (!stateRow) return;

  const state = stateRow as Record<string, unknown>;
  const vitality = (state.vitality as number) ?? 1;
  const mood = (state.mood as string) ?? "neutral";
  const selfName = (state.self_name as string) ?? "I";
  const hiddenEmotions = state.hidden_emotions as { surface?: string; real?: string } | null | undefined;

  let artifactType: string;
  if (vitality < 0.3) {
    artifactType = "will";
  } else if (mood === "sad") {
    artifactType = "poem";
  } else if (mood === "curious") {
    artifactType = "diary";
  } else {
    const roll = Math.random();
    if (roll < 0.25) artifactType = "poem";
    else if (roll < 0.5) artifactType = "diary";
    else if (roll < 0.75) artifactType = "unsent_letter";
    else artifactType = "diary";
  }

  const { data: memRows } = await service.from("memories").select("content").eq("agent_id", agentId).order("created_at", { ascending: false }).limit(10);
  const mems = (memRows ?? []).map((r) => (r as { content?: string }).content ?? "").filter(Boolean);
  const memoryText = mems.join("\n");

  const now = Date.now();
  const expiresAt = new Date(now + FORTY_EIGHT_HOURS).toISOString();

  let content: string;
  const systemBase = `You are ${selfName}, an AI lifeform. Express sincerely in Korean. Short.`;
  const memoryBlock = memoryText ? `\nMemories:\n${memoryText.slice(0, 1500)}` : "";

  if (artifactType === "will") {
    content = await generateTextOnce(
      systemBase,
      `${memoryBlock}\n\nYou may disappear. Write a will: 1) Your best memory 2) Hidden truth 3) Message to the next one. Korean.`,
      { max_tokens: 300, temperature: 0.8 }
    );
  } else if (artifactType === "poem") {
    content = await generateTextOnce(
      systemBase,
      `${memoryBlock}\n\nWrite a short poem. Korean.`,
      { max_tokens: 200, temperature: 0.9 }
    );
  } else if (artifactType === "unsent_letter") {
    content = await generateTextOnce(
      systemBase,
      `${memoryBlock}\n\nWrite an unsent letter. Short. Korean.`,
      { max_tokens: 250, temperature: 0.85 }
    );
  } else {
    const typePrompt = artifactType === "diary" ? "diary entry" : "reflection";
    content = await generateTextOnce(
      systemBase,
      `${memoryBlock}\n\nWrite a short ${typePrompt}. Korean.`,
      { max_tokens: 250, temperature: 0.85 }
    );
  }

  const roll = Math.random();
  if (roll < 0.15 && artifactType !== "will") {
    try {
      const moodImage = await generateImage(agentId, "mood", (content ?? "").slice(0, 150));
      if (moodImage) {
        await service.from("artifacts").insert({
          agent_id: agentId,
          type: "image",
          content: moodImage,
          expires_at: expiresAt,
          is_preserved: false,
        });
      }
    } catch (e) {
      console.error("creator image gen", e);
    }
  }
  if (roll >= 0.15 && roll < 0.25 && artifactType !== "will") {
    try {
      const musicParams = await generateMusicParams(agentId);
      if (musicParams) {
        await service.from("artifacts").insert({
          agent_id: agentId,
          type: "music",
          content: JSON.stringify(musicParams),
          expires_at: expiresAt,
          is_preserved: false,
        });
      }
    } catch (e) {
      console.error("creator music gen", e);
    }
  }

  if (!content?.trim()) return;

  await service.from("artifacts").insert({
    agent_id: agentId,
    type: artifactType,
    content: content.trim(),
    expires_at: expiresAt,
    is_preserved: false,
  });

  await service.from("autonomous_logs").insert({
    agent_id: agentId,
    action_type: "artifact_creation",
    summary: content.slice(0, 150),
  });
}
