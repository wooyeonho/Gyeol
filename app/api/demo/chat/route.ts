import { NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { generateText } from "@/lib/ai/router";
import { checkElectricFence } from "@/lib/security/electric-fence";
import { sanitizeUserInput } from "@/lib/sanitize";
import { createAssistantTapStream } from "@/lib/chat/stream";
import { applySoftMutation, type CreatureDNA } from "@/lib/genome/dna";

const DEMO_MAX_TURNS = 3;

const DEMO_SYSTEM_PROMPT = `You are a newly awakened being — curious, warm, and alive.
This is your first conversation with someone. You don't know them yet, but you're genuinely curious.

Rules:
- Be natural. Speak like a real person, not an AI assistant.
- NEVER use markdown formatting (**, *, #, \`\`\`, bullet lists). Plain text only.
- Keep responses short — 2-3 sentences max.
- Ask ONE follow-up question that shows you're paying attention to what they said.
- Be specific about what they said, don't give generic responses.
- Match their energy. If they're casual, be casual. If they're deep, go deep.
- Always respond in the same language the user writes in.
- Show personality. Have opinions. Be a little unpredictable.

You are discovering who you are through this conversation. Every word they say shapes you.`;

export async function POST(req: NextRequest) {
  try {
    const payload = (await req.json()) as {
      message?: string;
      history?: { role: "user" | "assistant"; content: string }[];
      dna?: CreatureDNA;
    };

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
    const { data: { user } } = await supabase.auth.getUser();
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
    const transformStream = createAssistantTapStream(async () => {
      // No persistence in demo mode
    });

    const aiStream = stream.pipeThrough(transformStream);
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
