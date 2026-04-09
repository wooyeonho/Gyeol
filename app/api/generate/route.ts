import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { ensurePrimaryAgent } from "@/lib/agents/primary";
import { checkRateLimit } from "@/lib/rate-limit";
import { logRouteError } from "@/lib/ops/logger";
import { verifyCsrfOrigin } from "@/lib/security/csrf";
import { checkElectricFence } from "@/lib/security/electric-fence";
import { parseBody, generateBodySchema } from "@/lib/validation/schemas";
import { logger } from "@/lib/logger";

const log = logger.child({ route: "api/generate" });

/**
 * Cloudflare Workers AI image generation via Stable Diffusion XL.
 * Returns a base64 PNG string on success, null on failure.
 */
async function generateImageCF(prompt: string): Promise<string | null> {
  const accountId = process.env.CF_ACCOUNT_ID;
  const apiToken = process.env.CF_API_TOKEN;
  if (!accountId || !apiToken) return null;

  const model = "@cf/stabilityai/stable-diffusion-xl-base-1.0";
  const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 30_000);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiToken}`,
      },
      body: JSON.stringify({ prompt, num_steps: 20 }),
      signal: ctrl.signal,
    });
    if (!res.ok) {
      log.error(`[Generate] CF image ${res.status}`, { detail: await res.text().catch(() => "") });
      return null;
    }
    // CF returns raw PNG bytes — keep timeout active during body download
    const buffer = await res.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    return `data:image/png;base64,${base64}`;
  } catch (e) {
    logRouteError("[Generate] CF image error:", e);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

function isGenerationAvailable(): boolean {
  // Cloudflare Workers AI is the primary provider
  return Boolean(process.env.CF_ACCOUNT_ID && process.env.CF_API_TOKEN);
}

export async function GET() {
  const available = isGenerationAvailable();
  return NextResponse.json({
    available,
    providerAvailable: available,
    integrationReady: available,
  });
}

/**
 * POST /api/generate
 * Real image generation using Cloudflare Workers AI (Stable Diffusion XL).
 * Generates images from text prompts and stores them as artifacts.
 */
export async function POST(request: NextRequest) {
  if (!verifyCsrfOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const allowed = await checkRateLimit(`generate:${user.id}`);
  if (!allowed) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const parsed = await parseBody(request, generateBodySchema);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const prompt = parsed.data.prompt.trim();
    const type = parsed.data.type;

    const fence = checkElectricFence(prompt);
    if (fence.blocked) {
      return NextResponse.json({ error: fence.reason || "Blocked content" }, { status: 400 });
    }

    if (!isGenerationAvailable()) {
      return NextResponse.json(
        { error: "No generation provider configured. Set CF_ACCOUNT_ID and CF_API_TOKEN.", url: null, prompt, type },
        { status: 503 },
      );
    }

    // Build generation prompt with context
    const genPrompt =
      type === "avatar"
        ? `Digital art avatar portrait, ethereal glowing creature, ${prompt}, dark background, soft lighting, minimalist, high quality`
        : prompt;

    const imageUrl = await generateImageCF(genPrompt);
    if (!imageUrl) {
      return NextResponse.json(
        { error: "Image generation failed. Please try again.", url: null, prompt, type },
        { status: 502 },
      );
    }

    // Persist as artifact
    try {
      const service = createServiceClient();
      const { agentId } = await ensurePrimaryAgent(service, user.id);
      if (agentId) {
        await service.from("artifacts").insert({
          agent_id: agentId,
          type: type === "avatar" ? "emotion_image" : "image",
          content: `[Generated] ${prompt}`,
          is_preserved: false,
          is_public: false,
        });
        await service.from("autonomous_logs").insert({
          agent_id: agentId,
          action_type: "image",
          summary: `Generated ${type}: ${prompt.slice(0, 100)}`,
        });
      }
    } catch (e) {
      // Non-fatal: image was generated, just didn't persist metadata
      log.warn("[Generate] persist error:", e instanceof Error ? e.message : String(e));
    }

    return NextResponse.json({ url: imageUrl, prompt, type, status: "completed" });
  } catch (error) {
    logRouteError("POST /api/generate error", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
