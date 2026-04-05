import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { spendCoinsAtomic } from "@/lib/economy/coins";
import { creatureConversationBodySchema, parseBody } from "@/lib/validation/schemas";
import {
  buildConversationPrompt,
  calculateConversationDNAEffects,
  MAX_CONVERSATION_TURNS,
  CONVERSATION_COST,
  type ConversationParticipant,
  type ConversationTurn,
} from "@/lib/social/creature-conversation";
import { generateJSON } from "@/lib/ai/router";

/**
 * POST /api/creature-conversation — Initiate a conversation between two creatures.
 * Body: { agentIdA, agentIdB, locale? }
 */
export async function POST(req: Request) {
  try {
    const authClient = await createServerSupabase();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const parsed = await parseBody(req, creatureConversationBodySchema);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const { agentIdA, agentIdB, locale } = parsed.data;

    const supabase = createServiceClient();

    // Verify initiator owns agentA
    const { data: ownership } = await supabase
      .from("agents")
      .select("id")
      .eq("id", agentIdA)
      .eq("user_id", user.id)
      .single();
    if (!ownership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Fetch both agents
    const [resA, resB] = await Promise.all([
      supabase.from("agent_state").select("config, mood").eq("agent_id", agentIdA).single(),
      supabase.from("agent_state").select("config, mood").eq("agent_id", agentIdB).single(),
    ]);

    if (!resA.data || !resB.data) {
      return NextResponse.json({ error: "One or both agents not found" }, { status: 404 });
    }

    // Build participants
    const configA = (resA.data.config ?? {}) as Record<string, unknown>;
    const configB = (resB.data.config ?? {}) as Record<string, unknown>;
    const genomeA = (configA.genome ?? {}) as Record<string, unknown>;
    const genomeB = (configB.genome ?? {}) as Record<string, unknown>;

    const participantA: ConversationParticipant = {
      agentId: agentIdA,
      name: (configA.custom_name as string) ?? "Creature A",
      dna: (genomeA.dna ?? {}) as ConversationParticipant["dna"],
      species: (genomeA.species as string) ?? "unknown",
      mood: (resA.data.mood as string) ?? "neutral",
      verbal: ((genomeA.dna as Record<string, number> | undefined)?.verbal ?? 0.5),
    };

    const participantB: ConversationParticipant = {
      agentId: agentIdB,
      name: (configB.custom_name as string) ?? "Creature B",
      dna: (genomeB.dna ?? {}) as ConversationParticipant["dna"],
      species: (genomeB.species as string) ?? "unknown",
      mood: (resB.data.mood as string) ?? "neutral",
      verbal: ((genomeB.dna as Record<string, number> | undefined)?.verbal ?? 0.5),
    };

    // Generate conversation
    const prompt = buildConversationPrompt(
      participantA,
      participantB,
      locale,
      MAX_CONVERSATION_TURNS,
    );

    const result = await generateJSON(prompt, "Generate the conversation turns as a JSON array.");

    // Parse turns
    let turns: ConversationTurn[] = [];
    if (Array.isArray(result)) {
      turns = (result as Array<{ speaker: string; text: string }>).map((t, i) => ({
        speakerId: t.speaker === "A" ? agentIdA : agentIdB,
        speakerName: t.speaker === "A" ? participantA.name : participantB.name,
        text: t.text,
        timestamp: new Date(Date.now() + i * 3000).toISOString(),
      }));
    }

    // Guard: don't charge if AI failed to generate turns
    if (turns.length === 0) {
      return NextResponse.json({ error: "Failed to generate conversation" }, { status: 502 });
    }

    // Atomic coin deduction — after all validation succeeds, before persisting results.
    // This prevents losing coins if agents don't exist or AI fails.
    const spent = await spendCoinsAtomic(agentIdA, CONVERSATION_COST, "creature_conversation");
    if (!spent) {
      return NextResponse.json(
        { error: "Not enough coins", required: CONVERSATION_COST },
        { status: 402 },
      );
    }

    // Calculate DNA effects
    const { effectsA, effectsB } = calculateConversationDNAEffects(participantA, participantB);

    // Apply DNA effects to both creatures
    const dnaA = (genomeA.dna ?? {}) as Record<string, number>;
    const dnaB = (genomeB.dna ?? {}) as Record<string, number>;
    const updatedDnaA: Record<string, number> = { ...dnaA };
    const updatedDnaB: Record<string, number> = { ...dnaB };
    for (const [axis, delta] of Object.entries(effectsA)) {
      if (typeof delta === "number") {
        updatedDnaA[axis] = Math.max(0, Math.min(1, (updatedDnaA[axis] ?? 0.5) + delta));
      }
    }
    for (const [axis, delta] of Object.entries(effectsB)) {
      if (typeof delta === "number") {
        updatedDnaB[axis] = Math.max(0, Math.min(1, (updatedDnaB[axis] ?? 0.5) + delta));
      }
    }

    // Coins deducted atomically above — now persist DNA changes
    await Promise.all([
      supabase
        .from("agent_state")
        .update({
          config: { ...configA, genome: { ...genomeA, dna: updatedDnaA } },
        })
        .eq("agent_id", agentIdA),
      supabase
        .from("agent_state")
        .update({
          config: { ...configB, genome: { ...genomeB, dna: updatedDnaB } },
        })
        .eq("agent_id", agentIdB),
    ]);

    // Log the conversation
    await supabase.from("social_logs").insert({
      agent_id: agentIdA,
      partner_id: agentIdB,
      topic: "creature_conversation",
      summary: turns[0].text.slice(0, 200),
    });

    return NextResponse.json({
      turns,
      dnaEffectsA: effectsA,
      dnaEffectsB: effectsB,
      coinsSpent: CONVERSATION_COST,
      participants: {
        a: { name: participantA.name, species: participantA.species },
        b: { name: participantB.name, species: participantB.species },
      },
    });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
