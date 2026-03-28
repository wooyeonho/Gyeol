import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { ensurePrimaryAgent } from "@/lib/agents/primary";
import { checkRateLimit } from "@/lib/rate-limit";
import { logRouteError } from "@/lib/ops/logger";
import { verifyCsrfOrigin } from "@/lib/security/csrf";
import { generatePortraitPrompt, generateAvatarPrompt } from "@/lib/genome/portrait-prompt";
import { deriveSpecies } from "@/lib/genome/species";
import type { CreatureDNA } from "@/lib/genome/dna";

const CF_SDXL_PATH = "@cf/stabilityai/stable-diffusion-xl-base-1.0";

async function generateImageCF(prompt: string): Promise<string | null> {
  const accountId = process.env.CF_ACCOUNT_ID;
  const apiToken = process.env.CF_API_TOKEN;
  if (!accountId || !apiToken) return null;

  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${CF_SDXL_PATH}`;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 45_000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiToken}` },
      body: JSON.stringify({ prompt: prompt.slice(0, 1500), num_steps: 20, width: 1024, height: 1024 }),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      console.error(`[Portrait] CF image ${res.status}`, await res.text().catch(() => ""));
      return null;
    }
    const buffer = await res.arrayBuffer();
    return `data:image/png;base64,${Buffer.from(buffer).toString("base64")}`;
  } catch (e) {
    logRouteError("[Portrait] CF image error:", e);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/**
 * GET /api/creature/portrait — list creature's portrait gallery
 */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const service = createServiceClient();
  const { agentId } = await ensurePrimaryAgent(service, user.id);
  if (!agentId) return NextResponse.json({ error: "No agent" }, { status: 404 });

  const { data: portraits } = await service
    .from("artifacts")
    .select("id, type, title, content, created_at, is_preserved")
    .eq("agent_id", agentId)
    .in("type", ["creature_portrait", "evolution_portrait", "avatar_portrait"])
    .order("created_at", { ascending: false })
    .limit(50);

  return NextResponse.json({ portraits: portraits ?? [] });
}

/**
 * POST /api/creature/portrait — generate a new portrait from DNA
 * Body: { context?: "portrait"|"full_body"|"action"|"dream", mood?: string }
 */
export async function POST(request: NextRequest) {
  if (!verifyCsrfOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await checkRateLimit(`portrait:${user.id}`);
  if (!allowed) {
    return NextResponse.json({ error: "Portrait generation limited to 5/hour" }, { status: 429 });
  }

  if (!process.env.CF_ACCOUNT_ID || !process.env.CF_API_TOKEN) {
    return NextResponse.json({ error: "Image generation not configured" }, { status: 503 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const context = (body?.context as "portrait" | "full_body" | "action" | "dream") || "portrait";
    const mood = typeof body?.mood === "string" ? body.mood : undefined;

    const service = createServiceClient();
    const { agentId } = await ensurePrimaryAgent(service, user.id);
    if (!agentId) return NextResponse.json({ error: "No agent" }, { status: 404 });

    // Fetch agent state with DNA
    const { data: stateRow } = await service
      .from("agent_state")
      .select("genome, gen_level, self_name, mood")
      .eq("agent_id", agentId)
      .single();

    if (!stateRow) return NextResponse.json({ error: "No agent state" }, { status: 404 });
    const state = stateRow as { genome?: { dna?: CreatureDNA }; gen_level?: number; self_name?: string; mood?: string };
    const dna = state.genome?.dna;
    if (!dna) return NextResponse.json({ error: "No DNA found — chat first to initialize" }, { status: 400 });

    const species = deriveSpecies(dna);
    const genLevel = state.gen_level ?? 1;
    const selfName = state.self_name ?? undefined;
    const effectiveMood = mood ?? state.mood ?? undefined;

    // Generate unique prompt from DNA
    const prompt = context === "portrait" && !mood
      ? generateAvatarPrompt(dna, species)
      : generatePortraitPrompt(dna, species, {
          genLevel,
          mood: effectiveMood,
          context,
          selfName,
        });

    const imageUrl = await generateImageCF(prompt);
    if (!imageUrl) {
      return NextResponse.json({ error: "Image generation failed" }, { status: 502 });
    }

    // Persist as portrait artifact
    const title = `${species.name} — ${context} (Gen ${genLevel})`;
    await service.from("artifacts").insert({
      agent_id: agentId,
      type: "creature_portrait",
      title,
      content: JSON.stringify({
        image: imageUrl,
        prompt: prompt.slice(0, 500),
        context,
        species: species.name,
        archetype: species.archetype,
        element: species.element,
        genLevel,
        mood: effectiveMood,
      }),
      is_preserved: true,
      is_public: false,
    });

    await service.from("autonomous_logs").insert({
      agent_id: agentId,
      action_type: "portrait_generation",
      summary: `Portrait generated: ${species.name} (${context})`,
    });

    return NextResponse.json({
      url: imageUrl,
      title,
      species: species.name,
      archetype: species.archetype,
      element: species.element,
      context,
      prompt: prompt.slice(0, 200),
    });
  } catch (error) {
    logRouteError("POST /api/creature/portrait error", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
