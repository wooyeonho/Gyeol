import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";
import { verifyCsrfOrigin } from "@/lib/security/csrf";
import { logger } from "@/lib/logger";

const log = logger.child({ route: "api/stt" });

const GROQ_WHISPER_URL = "https://api.groq.com/openai/v1/audio/transcriptions";

export async function POST(req: NextRequest) {
  if (!verifyCsrfOrigin(req)) {
    return NextResponse.json({ error: "CSRF origin check failed" }, { status: 403 });
  }
  try {
    const supabase = await createServerSupabase();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
    }

    const allowed = await checkRateLimit(`stt:${user.id}`);
    if (!allowed) {
      return new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 });
    }

    const apiKey = process.env.GROQ_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "STT not configured" }), { status: 503 });
    }

    const formData = await req.formData();
    const audioFile = formData.get("audio");
    if (!audioFile || !(audioFile instanceof Blob)) {
      return new Response(JSON.stringify({ error: "No audio file" }), { status: 400 });
    }

    // Limit file size to 25MB (Groq/Whisper limit)
    if (audioFile.size > 25 * 1024 * 1024) {
      return new Response(JSON.stringify({ error: "Audio file too large" }), { status: 400 });
    }

    const language = (formData.get("language") as string) || undefined;

    const whisperForm = new FormData();
    whisperForm.append("file", audioFile, "recording.webm");
    whisperForm.append("model", "whisper-large-v3-turbo");
    if (language) {
      whisperForm.append("language", language);
    }

    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 30000);

    try {
      const res = await fetch(GROQ_WHISPER_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}` },
        body: whisperForm,
        signal: ctrl.signal,
      });
      clearTimeout(timer);

      if (!res.ok) {
        const errText = await res.text().catch(() => "Unknown error");
        log.error("[STT] Groq Whisper error:", { status: res.status, detail: errText });
        return new Response(JSON.stringify({ error: "Transcription failed" }), { status: 502 });
      }

      const data = (await res.json()) as { text?: string };
      return new Response(JSON.stringify({ text: data.text ?? "" }), {
        headers: { "Content-Type": "application/json" },
      });
    } catch (e) {
      clearTimeout(timer);
      log.error("[STT] Whisper request failed:", e instanceof Error ? e : { detail: String(e) });
      return new Response(JSON.stringify({ error: "Transcription timeout" }), { status: 504 });
    }
  } catch (e) {
    log.error("[STT]", e instanceof Error ? e : { detail: String(e) });
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500 });
  }
}
