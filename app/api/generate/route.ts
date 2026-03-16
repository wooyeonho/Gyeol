import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

function getGenerationStatus() {
  const providerKey = process.env.OPENAI_API_KEY || process.env.REPLICATE_API_TOKEN;
  return {
    providerAvailable: Boolean(providerKey),
    integrationReady: false,
  };
}

export async function GET() {
  const status = getGenerationStatus();
  return NextResponse.json({
    available: status.providerAvailable && status.integrationReady,
    providerAvailable: status.providerAvailable,
    integrationReady: status.integrationReady,
  });
}

/**
 * POST /api/generate
 * Placeholder generation endpoint. Returns a stub response when no generation
 * provider (e.g. DALL-E, Stable Diffusion) is configured. When a provider key
 * is available the handler can be extended to call the real API.
 */
export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    const prompt = typeof body?.prompt === "string" ? body.prompt.trim() : "";
    const type = body?.type === "image" ? "image" : "avatar";

    if (!prompt) {
      return NextResponse.json({ error: "Prompt is required" }, { status: 400 });
    }

    const status = getGenerationStatus();
    if (!status.providerAvailable) {
      return NextResponse.json(
        {
          error: "No generation provider configured. Set OPENAI_API_KEY or REPLICATE_API_TOKEN.",
          url: null,
          prompt,
          type,
        },
        { status: 503 },
      );
    }

    if (!status.integrationReady) {
      return NextResponse.json(
        {
          error: "Generation is not ready yet. The page is visible, but the provider workflow is still being finalized.",
          url: null,
          prompt,
          type,
        },
        { status: 503 },
      );
    }

    return NextResponse.json({
      url: null,
      prompt,
      type,
      status: "queued",
      message: "Generation provider detected but integration pending.",
    });
  } catch (error) {
    console.error("POST /api/generate error", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
