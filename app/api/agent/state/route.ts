import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { isMissingEnvError } from "@/lib/env/required";
import { ensurePrimaryAgent } from "@/lib/agents/primary";
import { getDemoAgentState } from "@/lib/demo/runtime";
import { generateInitialDNA } from "@/lib/genome/dna";
import { deriveSpecies } from "@/lib/genome/species";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const service = createServiceClient();
    const { agentId, hasMultiple } = await ensurePrimaryAgent(service, user.id);
    if (!agentId) {
      return NextResponse.json({ agentId: null, agentState: null });
    }
    const { data: state } = await service.from("agent_state").select("*").eq("agent_id", agentId).single();

    // Backfill genome for pre-existing agents that were created before DNA system
    const stateRow = state as Record<string, unknown> | null;
    if (stateRow && !stateRow.genome) {
      try {
        const initialDNA = generateInitialDNA(agentId);
        const initialSpecies = deriveSpecies(initialDNA);
        const genome = { dna: initialDNA, species: initialSpecies.name, archetype: initialSpecies.archetype, element: initialSpecies.element };
        await service.from("agent_state").update({ genome }).eq("agent_id", agentId);
        stateRow.genome = genome;
        console.log(`[AgentState] Backfilled genome for agent ${agentId}`);
      } catch (backfillErr) {
        console.error("[AgentState] Genome backfill failed (non-fatal)", backfillErr);
      }
    }

    return NextResponse.json({ agentId, agentState: state ?? null, hasMultipleAgents: hasMultiple });
  } catch (e) {
    console.error("GET /api/agent/state error", e);
    if (isMissingEnvError(e)) {
      return NextResponse.json(
        {
          agentId: "demo-agent",
          agentState: getDemoAgentState(),
          hasMultipleAgents: false,
          demo_mode: true,
        }
      );
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
