import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { processUserMemorials } from "@/lib/memorial/user-memorial";

const EMOTION_KEYS = ["calm", "anxiety", "curiosity", "sadness"];
const TWENTY_FOUR_HOURS_MS = 24 * 60 * 60 * 1000;

export async function GET(request: NextRequest) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const service = createServiceClient();
  const since = new Date(Date.now() - TWENTY_FOUR_HOURS_MS).toISOString();
  const { data: mems } = await service.from("memories").select("content").gte("created_at", since);
  const contents = (mems ?? []).map((r) => ((r as { content?: string }).content ?? "").toLowerCase());

  const emotionCounts: Record<string, number> = { calm: 0, anxiety: 0, curiosity: 0, sadness: 0 };
  const wordCounts: Record<string, number> = {};
  const calmWords = ["calm", "peace", "good", "happy", "ok", "fine"];
  const anxietyWords = ["worry", "anxious", "scared", "nervous", "fear"];
  const curiosityWords = ["why", "what", "how", "curious", "wonder"];
  const sadnessWords = ["sad", "lonely", "miss", "sorry", "hurt"];

  for (const text of contents) {
    for (const w of calmWords) if (text.includes(w)) emotionCounts.calm++;
    for (const w of anxietyWords) if (text.includes(w)) emotionCounts.anxiety++;
    for (const w of curiosityWords) if (text.includes(w)) emotionCounts.curiosity++;
    for (const w of sadnessWords) if (text.includes(w)) emotionCounts.sadness++;
    const words = text.replace(/[^\w\s]/g, " ").split(/\s+/).filter((x) => x.length > 1);
    for (const w of words) wordCounts[w] = (wordCounts[w] ?? 0) + 1;
  }

  const total = contents.length * 10 || 1;
  const collective_emotion = {
    calm: emotionCounts.calm / total,
    anxiety: emotionCounts.anxiety / total,
    curiosity: emotionCounts.curiosity / total,
    sadness: emotionCounts.sadness / total,
  };
  const trending_words = Object.entries(wordCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([word]) => word);

  let weatherName = "Calm day";
  const modifiers: Record<string, number> = {};
  if (collective_emotion.anxiety > 0.3) {
    weatherName = "Day of strong mutation";
    modifiers.mutation_modifier = 0.2;
  } else if (collective_emotion.calm > 0.5) {
    weatherName = "Calm day";
  } else if (collective_emotion.curiosity > 0.3) {
    weatherName = "Day of vivid memory";
    modifiers.memory_accuracy_modifier = 0.2;
  } else if (collective_emotion.sadness > 0.3) {
    weatherName = "Quiet day";
    modifiers.life_interval_modifier = 2.0;
  }
  if (Math.random() < 0.05) {
    weatherName = "Festival";
    modifiers.social_modifier = 3.0;
  } else if (Math.random() < 0.02) {
    weatherName = "Storm";
    modifiers.entropy_accel = 1;
  }

  const payload = {
    weather: { name: weatherName, ...modifiers },
    collective_emotion,
    trending_words,
    updated_at: new Date().toISOString(),
  };
  const { data: existing } = await service.from("world_state").select("id, memorial").eq("id", "global").single();
  const memorial = (existing as { memorial?: unknown } | null)?.memorial ?? [];
  const fullPayload = { ...payload, memorial };
  if (existing) {
    await service.from("world_state").update(fullPayload).eq("id", "global");
  } else {
    await service.from("world_state").upsert({ id: "global", ...fullPayload }, { onConflict: "id" });
  }

  let memorialsAdded = 0;
  try {
    memorialsAdded = await processUserMemorials();
  } catch (e) {
    console.error("processUserMemorials", e);
  }

  return new Response(
    JSON.stringify({ ok: true, weather: weatherName, memorialsAdded }),
    { headers: { "Content-Type": "application/json" } }
  );
}
