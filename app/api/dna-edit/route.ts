import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import {
  calculateEditCost,
  validateEdits,
  applyDNAEdits,
} from "@/lib/genome/dna-editor";
import { DNA_AXES, type CreatureDNA } from "@/lib/genome/dna";
import { deriveSpecies } from "@/lib/genome/species";

/**
 * POST /api/dna-edit — Apply user-controlled DNA edits.
 * Body: { agentId, edits: Record<DNAAxis, number> }
 * Charges coins based on total adjustment magnitude.
 */
export async function POST(req: Request) {
  try {
    const authClient = await createServerSupabase();
    const { data: { user } } = await authClient.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { agentId, edits } = body as {
      agentId?: string;
      edits?: Record<string, number>;
    };

    if (!agentId || !edits) {
      return NextResponse.json({ error: "agentId and edits required" }, { status: 400 });
    }

    const supabase = createServiceClient();
    const { data: ownership } = await supabase
      .from("agents")
      .select("id")
      .eq("id", agentId)
      .eq("user_id", user.id)
      .single();
    if (!ownership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    const { data } = await supabase
      .from("agent_state")
      .select("config, coins")
      .eq("agent_id", agentId)
      .single();

    if (!data) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

    const config = (data.config ?? {}) as Record<string, unknown>;
    const coins = (data.coins as number) ?? 0;
    const genome = config.genome as Record<string, unknown> | undefined;

    if (!genome?.dna) {
      return NextResponse.json({ error: "Agent has no DNA" }, { status: 400 });
    }

    const currentDNA = genome.dna as CreatureDNA;

    // Build a preview DNA with edits applied
    const { dna: previewDNA, changedAxes, totalDelta } = applyDNAEdits(currentDNA, edits);

    if (changedAxes.length === 0) {
      return NextResponse.json({ error: "No changes detected" }, { status: 400 });
    }

    // Validate
    const validation = validateEdits(currentDNA, previewDNA);
    if (!validation.valid) {
      return NextResponse.json({ error: "Invalid edits", details: validation.errors }, { status: 400 });
    }

    // Calculate cost
    const cost = calculateEditCost(currentDNA, previewDNA);
    if (coins < cost) {
      return NextResponse.json(
        { error: "Not enough coins", required: cost, current: coins },
        { status: 402 },
      );
    }

    // Apply
    const newSpecies = deriveSpecies(previewDNA);
    const updatedGenome = {
      ...genome,
      dna: previewDNA,
      species: newSpecies.name,
      archetype: newSpecies.archetype,
      element: newSpecies.element,
    };

    await supabase
      .from("agent_state")
      .update({
        config: { ...config, genome: updatedGenome },
        coins: coins - cost,
      })
      .eq("agent_id", agentId);

    return NextResponse.json({
      dna: previewDNA,
      species: newSpecies,
      changedAxes,
      coinsSpent: cost,
      coinsRemaining: coins - cost,
    });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
