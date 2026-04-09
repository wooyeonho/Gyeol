import { NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { ensurePrimaryAgent } from "@/lib/agents/primary";
import { deriveSpecies } from "@/lib/genome/species";
import { DNA_AXES, type CreatureDNA } from "@/lib/genome/dna";
import { seedDnaBodySchema, parseBody } from "@/lib/validation/schemas";
import { logger } from "@/lib/logger";

const log = logger.child({ route: "api/agent/seed-dna" });

/**
 * POST /api/agent/seed-dna
 * Transfers demo DNA to a freshly-created agent (total_messages === 0).
 * Only works once per agent — subsequent calls are ignored.
 */
export async function POST(req: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });

    const parsed = await parseBody(req, seedDnaBodySchema);
    if (!parsed.success) {
      return new Response(JSON.stringify({ error: parsed.error }), { status: 400 });
    }

    // Validate and clamp all 16 axes
    const dna = {} as Record<string, number>;
    for (const axis of DNA_AXES) {
      const val = parsed.data.dna[axis];
      if (typeof val !== "number" || isNaN(val)) {
        return new Response(JSON.stringify({ error: `Invalid axis: ${axis}` }), { status: 400 });
      }
      dna[axis] = Math.max(0, Math.min(1, val));
    }

    const service = createServiceClient();
    const { agentId } = await ensurePrimaryAgent(service, user.id);
    if (!agentId) return new Response(JSON.stringify({ error: "No agent" }), { status: 404 });

    // Only seed if agent is brand new (0 messages)
    const { data: state } = await service
      .from("agent_state")
      .select("total_messages")
      .eq("agent_id", agentId)
      .maybeSingle();

    const totalMessages = (state as { total_messages?: number } | null)?.total_messages ?? 0;
    if (totalMessages > 0) {
      return new Response(JSON.stringify({ ok: true, seeded: false }), { status: 200 });
    }

    const species = deriveSpecies(dna as unknown as CreatureDNA);
    await service
      .from("agent_state")
      .update({
        genome: {
          dna,
          species: species.name,
          archetype: species.archetype,
          element: species.element,
        },
      })
      .eq("agent_id", agentId);

    return new Response(JSON.stringify({ ok: true, seeded: true }), { status: 200 });
  } catch (e) {
    log.error("POST failed", e instanceof Error ? e : { detail: String(e) });
    return new Response(JSON.stringify({ error: "Internal error" }), { status: 500 });
  }
}
