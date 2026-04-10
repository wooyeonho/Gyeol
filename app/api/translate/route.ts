import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const SUPPORTED_LANGS = ["ko", "en", "ja", "zh", "es"] as const;
type Lang = (typeof SUPPORTED_LANGS)[number];

const LANG_NAMES: Record<Lang, string> = {
  ko: "Korean", en: "English", ja: "Japanese", zh: "Chinese", es: "Spanish",
};

/**
 * POST /api/translate
 * Translates text using Claude via Cloudflare Workers AI or Groq.
 */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const { text, targetLang = "en" } = body as { text?: string; targetLang?: string };

  if (!text || typeof text !== "string" || text.length > 2000) {
    return NextResponse.json({ error: "Invalid text" }, { status: 400 });
  }
  if (!SUPPORTED_LANGS.includes(targetLang as Lang)) {
    return NextResponse.json({ error: "Unsupported language" }, { status: 400 });
  }

  const targetName = LANG_NAMES[targetLang as Lang];

  try {
    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "Translation service unavailable" }, { status: 503 });
    }

    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "llama-3.1-8b-instant",
        messages: [
          {
            role: "system",
            content: `You are a precise translator. Translate the user's text to ${targetName}. Output ONLY the translated text, no explanation, no quotes.`,
          },
          { role: "user", content: text },
        ],
        max_tokens: 1024,
        temperature: 0.1,
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Translation failed" }, { status: 502 });
    }

    const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> };
    const translated = data.choices?.[0]?.message?.content?.trim() ?? "";

    return NextResponse.json({ translated, targetLang });
  } catch {
    return NextResponse.json({ error: "Translation error" }, { status: 500 });
  }
}
