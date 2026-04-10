import { NextRequest, NextResponse } from "next/server";
import { generateTextOnce } from "@/lib/ai/router";
import { DNA_AXES, getDominantTraits, getRecessiveTraits, type CreatureDNA } from "@/lib/genome/dna";
import { deriveSpecies } from "@/lib/genome/species";
import { verifyCsrfOrigin } from "@/lib/security/csrf";
import { logger } from "@/lib/logger";

// ── Rate limiting: per-minute to prevent AI cost abuse ──
const READING_RATE_WINDOW_MS = 60_000;
const READING_MAX_PER_MINUTE = 5;

type ReadingRateBucket = { count: number; resetAt: number };
const readingRateBuckets = new Map<string, ReadingRateBucket>();

function checkReadingRateLimit(ip: string): boolean {
  const now = Date.now();
  const bucket = readingRateBuckets.get(ip);
  if (!bucket) {
    readingRateBuckets.set(ip, { count: 1, resetAt: now + READING_RATE_WINDOW_MS });
    return true;
  }
  if (now >= bucket.resetAt) {
    bucket.count = 1;
    bucket.resetAt = now + READING_RATE_WINDOW_MS;
    return true;
  }
  if (bucket.count >= READING_MAX_PER_MINUTE) return false;
  bucket.count++;
  return true;
}

// Periodic cleanup to prevent memory leak
const _readingCleanup = setInterval(() => {
  const now = Date.now();
  for (const [key, bucket] of readingRateBuckets) {
    if (now >= bucket.resetAt) readingRateBuckets.delete(key);
  }
}, 5 * 60_000);
if (typeof _readingCleanup === "object" && "unref" in _readingCleanup) {
  (_readingCleanup as { unref: () => void }).unref();
}

/**
 * POST /api/demo/reading
 *
 * Generates a personalized "soul reading" from DNA profile + conversation history.
 * This is the emotional core of the demo — the thing people screenshot and share.
 */
export async function POST(req: NextRequest) {
  if (!verifyCsrfOrigin(req)) {
    return NextResponse.json({ error: "CSRF origin check failed" }, { status: 403 });
  }
  try {
    // Rate limit by IP to prevent AI cost abuse
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    if (!checkReadingRateLimit(ip)) {
      return NextResponse.json({ error: "Too many requests" }, { status: 429 });
    }

    const payload = (await req.json()) as {
      dna?: CreatureDNA;
      history?: { role: string; content: string }[];
    };

    if (!payload.dna) {
      return NextResponse.json({ error: "No DNA" }, { status: 400 });
    }

    const dna = payload.dna;
    const history = payload.history || [];
    const species = deriveSpecies(dna);
    const dominant = getDominantTraits(dna, 3);
    const recessive = getRecessiveTraits(dna, 2);

    // Build a rich context for the reading
    const userMessages = history
      .filter((m) => m.role === "user")
      .map((m) => m.content)
      .join("\n");

    const dnaProfile = DNA_AXES.map(
      (axis) => `${axis}: ${(dna[axis] * 100).toFixed(0)}%`
    ).join(", ");

    const systemPrompt = `You are a poetic personality reader. You create brief, piercing personality readings that make people feel deeply seen.

Rules:
- Write EXACTLY 2-3 sentences. No more.
- Be specific and personal, not generic. Reference what you can infer from the DNA pattern.
- Use concrete imagery, not abstract platitudes.
- Never use phrases like "you are someone who" or "you tend to" — instead, paint a picture.
- The reading should feel like a mirror — something that makes the person pause and think "...that's me."
- Do NOT mention DNA, axes, scores, or any technical terms.
- Do NOT use markdown.
- Write in second person ("you").
- Match the emotional weight of the conversation. If they were playful, the reading can be lighter. If they were deep, go deeper.`;

    const userPrompt = `Generate a personality reading based on this data.

What they said in conversation:
${userMessages || "(They were quiet — that says something too.)"}

Their pattern profile:
Strongest traits: ${dominant.join(", ")}
Quietest traits: ${recessive.join(", ")}
Full profile: ${dnaProfile}
Species archetype: ${species.archetype}
Element: ${species.element}

Write the reading now. 2-3 sentences only.`;

    const reading = await generateTextOnce(systemPrompt, userPrompt, {
      max_tokens: 150,
      temperature: 0.8,
    });

    if (!reading) {
      // Fallback: generate a deterministic reading from DNA
      const fallback = generateFallbackReading(dna, dominant);
      return NextResponse.json({ reading: fallback, species: species.name });
    }

    return NextResponse.json({ reading: reading.trim(), species: species.name });
  } catch (e) {
    logger.error("[DemoReading]", e instanceof Error ? e : { error: e });
    return NextResponse.json({ error: "Failed to generate reading" }, { status: 500 });
  }
}

function generateFallbackReading(dna: CreatureDNA, dominant: string[]): string {
  const fragments: Record<string, string> = {
    analytical: "Your mind moves in patterns others don't notice — you see the architecture beneath the surface.",
    intuitive: "You know things before you can explain them, trusting a compass that doesn't follow maps.",
    verbal: "Words are your medium — you think by speaking, and speak with precision that lingers.",
    spatial: "You see systems where others see chaos, building bridges between ideas nobody thought to connect.",
    warmth: "People feel safe near you without knowing why — your presence is a quiet flame that others orbit.",
    intensity: "You feel everything at full volume. It's exhausting and beautiful and you wouldn't trade it.",
    stability: "You're the ground beneath other people's storms. Still waters, but nothing about you is shallow.",
    openness: "You walk through doors others haven't noticed, collecting experiences like rare stones.",
    assertiveness: "You take up space unapologetically — not loud, just certain. That certainty moves rooms.",
    empathy: "You carry pieces of other people's feelings like they're your own. It's heavy, but it's your gift.",
    playfulness: "Life bends around your humor. You find the absurd in the serious and the serious in the absurd.",
    independence: "You've built a world inside yourself that doesn't need permission from anyone else.",
    curiosity: "Questions are your oxygen. You'd rather have an interesting question than a comfortable answer.",
    persistence: "You don't let go. Not of ideas, not of people, not of the things that matter. That scares some people.",
    adaptability: "You're water — taking the shape of whatever container life puts you in, but never losing yourself.",
    creativity: "You see what doesn't exist yet and feel compelled to make it real.",
  };

  const lines = dominant.slice(0, 2).map((d) => fragments[d] || "");
  return lines.filter(Boolean).join(" ");
}
