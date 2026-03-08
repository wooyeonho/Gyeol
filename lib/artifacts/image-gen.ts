import { createServiceClient } from "@/lib/supabase/service";

const CF_SDXL_PATH = "@cf/stabilityai/stable-diffusion-xl-base-1.0";

function getCfSdxlUrl(): string {
  const accountId = process.env.CF_ACCOUNT_ID;
  if (!accountId) throw new Error("CF_ACCOUNT_ID missing");
  return `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${CF_SDXL_PATH}`;
}

function getCfHeaders(): HeadersInit {
  const token = process.env.CF_API_TOKEN;
  if (!token) throw new Error("CF_API_TOKEN missing");
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export type ImagePromptPurpose = "dream" | "mood" | "portrait";

export async function generateImage(
  agentId: string,
  purpose: ImagePromptPurpose,
  textPrompt: string
): Promise<string | null> {
  const service = createServiceClient();
  const { data: stateRow } = await service
    .from("agent_state")
    .select("art_style, self_name, mood")
    .eq("agent_id", agentId)
    .single();
  const state = (stateRow ?? {}) as { art_style?: { style?: string; palette?: string[] }; self_name?: string; mood?: string };
  const artStyle = state.art_style ?? { style: "abstract", palette: ["#6366f1", "#8b5cf6"] };
  const style = artStyle.style ?? "abstract";
  const palette = artStyle.palette ?? ["#6366f1"];
  const colorHint = palette.slice(0, 3).join(", ");
  const fullPrompt =
    purpose === "dream"
      ? `dreamlike, surreal, ${style} style, colors ${colorHint}, ${textPrompt}`
      : purpose === "mood"
        ? `emotional, ${style} style, colors ${colorHint}, mood: ${state.mood ?? "neutral"}, ${textPrompt}`
        : `portrait style, ${style}, colors ${colorHint}, ${textPrompt}`;

  try {
    const res = await fetch(getCfSdxlUrl(), {
      method: "POST",
      headers: getCfHeaders(),
      body: JSON.stringify({
        prompt: fullPrompt.slice(0, 1000),
        width: 512,
        height: 512,
        num_steps: 14,
      }),
    });
    if (!res.ok) {
      console.error("CF SDXL error", res.status, await res.text());
      return null;
    }
    const blob = await res.blob();
    const buf = await blob.arrayBuffer();
    const base64 = Buffer.from(buf).toString("base64");
    return `data:image/png;base64,${base64}`;
  } catch (e) {
    console.error("generateImage error", e);
    return null;
  }
}
