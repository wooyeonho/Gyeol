import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SPECIES_PROMPTS: Record<string, string> = {
  fluff: "a soft fluffy chick creature with big eyes, cute and warm, pastel colors",
  ember: "a fiery creature with glowing orange and red embers, powerful and intense",
  aqua:  "a glowing blue water creature with translucent body, calm and ethereal",
  terra: "an earthy green creature with mossy textures, gentle and grounded",
  spark: "an electric yellow creature with crackling energy, energetic and bright",
  void:  "a mysterious dark creature with starry void patterns, enigmatic and deep",
  prism: "a rainbow prismatic creature refracting light, joyful and colorful",
};

const EVENT_PROMPTS: Record<string, string> = {
  level_up:   "celebrating with sparkles and triumphant pose",
  evolution:  "glowing with transformation energy, mid-evolution aura",
  birthday:   "surrounded by floating birthday cake and stars",
  default:    "in a cozy peaceful moment, soft ambient lighting",
};

/**
 * POST /api/creature/selfie
 * Generates an AI image of the creature using Cloudflare Workers AI (SDXL).
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { event = "default" } = body as { event?: string };

  // Fetch creature info
  const { data: agent } = await supabase
    .from("agents")
    .select("species, custom_name, level")
    .eq("user_id", user.id)
    .maybeSingle();

  if (!agent) return NextResponse.json({ error: "No agent found" }, { status: 404 });

  const speciesPrompt = SPECIES_PROMPTS[agent.species ?? "fluff"] ?? SPECIES_PROMPTS.fluff;
  const eventPrompt = EVENT_PROMPTS[event] ?? EVENT_PROMPTS.default;
  const prompt = `Digital art of ${speciesPrompt}, ${eventPrompt}, fantasy creature, Studio Ghibli inspired, soft lighting, high quality, cute illustration style`;

  // Call Cloudflare Workers AI
  const cfAccountId = process.env.CLOUDFLARE_ACCOUNT_ID;
  const cfToken = process.env.CLOUDFLARE_API_TOKEN;

  if (!cfAccountId || !cfToken) {
    return NextResponse.json({ error: "Image generation unavailable" }, { status: 503 });
  }

  try {
    const res = await fetch(
      `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/ai/run/@cf/stabilityai/stable-diffusion-xl-base-1.0`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${cfToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          negative_prompt: "ugly, blurry, dark, scary, violent, text, watermark",
          num_steps: 20,
          width: 512,
          height: 512,
        }),
      },
    );

    if (!res.ok) return NextResponse.json({ error: "Image generation failed" }, { status: 502 });

    const imageBuffer = await res.arrayBuffer();

    // Upload to Supabase Storage
    const fileName = `selfies/${user.id}/${Date.now()}.png`;
    const { error: uploadError } = await supabase.storage
      .from("creature-images")
      .upload(fileName, imageBuffer, { contentType: "image/png", upsert: false });

    if (uploadError) return NextResponse.json({ error: "Upload failed" }, { status: 500 });

    const { data: publicUrl } = supabase.storage
      .from("creature-images")
      .getPublicUrl(fileName);

    // Save to album
    await supabase.from("album_items").insert({
      user_id: user.id,
      image_url: publicUrl.publicUrl,
      caption: `${agent.custom_name ?? "크리처"}의 셀카 (${event})`,
      source: "selfie",
      event_type: event,
    }).select().maybeSingle();

    return NextResponse.json({ imageUrl: publicUrl.publicUrl, prompt });
  } catch {
    return NextResponse.json({ error: "Generation error" }, { status: 500 });
  }
}
