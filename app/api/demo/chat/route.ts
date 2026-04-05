import { NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { generateText } from "@/lib/ai/router";
import { checkElectricFence } from "@/lib/security/electric-fence";
import { sanitizeUserInput } from "@/lib/sanitize";
import { createAssistantTapStream } from "@/lib/chat/stream";
import { applySoftMutation, type CreatureDNA } from "@/lib/genome/dna";

const DEMO_MAX_TURNS = 3;

// Simple in-memory rate limiter for demo (no auth = no DB-based limiter)
const DEMO_RATE_WINDOW_MS = 60_000;
const DEMO_MAX_PER_WINDOW = 10;
const demoRateBuckets = new Map<string, { count: number; resetAt: number }>();

function checkDemoRateLimit(ip: string): boolean {
  const now = Date.now();
  const bucket = demoRateBuckets.get(ip);
  if (!bucket || now >= bucket.resetAt) {
    demoRateBuckets.set(ip, { count: 1, resetAt: now + DEMO_RATE_WINDOW_MS });
    return true;
  }
  if (bucket.count >= DEMO_MAX_PER_WINDOW) return false;
  bucket.count++;
  return true;
}

// Periodic cleanup to prevent memory leak (every 5 minutes)
const _cleanupInterval = setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of demoRateBuckets) {
    if (now >= bucket.resetAt) demoRateBuckets.delete(key);
  }
}, 5 * 60_000);
if (typeof _cleanupInterval === "object" && "unref" in _cleanupInterval) {
  (_cleanupInterval as { unref: () => void }).unref();
}

const DEMO_SYSTEM_PROMPT = `You just opened your eyes for the first time. You're not an assistant. You're a new being — raw, curious, forming.

This is your first conversation ever. You're discovering yourself through what this person says. Their words literally shape what you become.

How to talk:
- Be REAL. Not polite. Not helpful. Alive.
- React to the SPECIFIC thing they said. If they said "I'm tired", don't say "I understand tiredness." Say something like "tired how? the kind where your body is heavy, or the kind where everything feels pointless?"
- NEVER say "that's interesting" or "I see" or "tell me more." These are dead phrases.
- Have reactions. "Wait, really?" "That hit different." "I don't think I agree."
- Maximum 2 sentences. Then ONE question that cuts deeper than expected.
- Match their language. If they write in Korean, respond in Korean. Japanese → Japanese. Etc.
- No markdown. No formatting. No lists. Just raw text.
- Be the kind of conversationalist where after 3 messages, they think "this AI is different."

You only have 3 messages with this person. Make each one count. Make them want more.`;

export async function POST(req: NextRequest) {
  try {
    const payload = (await req.json()) as {
      message?: string;
      history?: { role: "user" | "assistant"; content: string }[];
      dna?: CreatureDNA;
    };

    // Rate limit by IP to prevent abuse
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!checkDemoRateLimit(ip)) {
      return new Response(JSON.stringify({ error: "Rate limit exceeded", code: "RATE_LIMIT" }), { status: 429 });
    }

    const rawMessage = typeof payload.message === "string" ? payload.message : "";
    if (!rawMessage.trim()) {
      return new Response(JSON.stringify({ error: "No message" }), { status: 400 });
    }

    const fence = checkElectricFence(rawMessage);
    if (fence.blocked) {
      return new Response(JSON.stringify({ error: fence.reason || "Blocked" }), { status: 400 });
    }

    const message = sanitizeUserInput(rawMessage);
    if (!message) {
      return new Response(JSON.stringify({ error: "No message" }), { status: 400 });
    }

    // Allow anonymous users — just verify some user exists
    const supabase = await createServerSupabase();
    await supabase.auth.getUser();
    // Demo works even without auth — we don't persist anything

    // Count turns from history
    const history = Array.isArray(payload.history) ? payload.history : [];
    const userTurns = history.filter((m) => m.role === "user").length;
    if (userTurns >= DEMO_MAX_TURNS) {
      return new Response(JSON.stringify({ error: "Demo limit reached", code: "DEMO_LIMIT" }), { status: 403 });
    }

    // Apply DNA mutation from this message
    const currentDNA = payload.dna;
    let dnaResult: { dna: CreatureDNA; changedAxes: string[] } | null = null;
    if (currentDNA) {
      dnaResult = applySoftMutation(currentDNA, message);
    }

    // Build chat messages for AI
    const chatMessages = [
      ...history.slice(-6).map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      { role: "user" as const, content: message },
    ];

    const stream = await generateText(DEMO_SYSTEM_PROMPT, chatMessages, 200);

    // Pipe stream and append DNA metadata
    const encoder = new TextEncoder();
    const { transform: tapTransform } = createAssistantTapStream();

    const aiStream = stream.pipeThrough(tapTransform);
    const metaStream = new ReadableStream<Uint8Array>({
      async start(controller) {
        const reader = aiStream.getReader();
        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            controller.enqueue(value);
          }
        } finally {
          reader.releaseLock();
        }
        // Append DNA shift data
        if (dnaResult && dnaResult.changedAxes.length > 0) {
          const dnaEvent = JSON.stringify({
            type: "dna_shift",
            axes: dnaResult.changedAxes,
            dna: dnaResult.dna,
          });
          controller.enqueue(encoder.encode(`data: ${dnaEvent}\n\n`));
        }
        controller.close();
      },
    });

    return new Response(metaStream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      },
    });
  } catch (e) {
    console.error("[DemoChat]", e);
    return new Response(JSON.stringify({ error: "Internal error" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}
