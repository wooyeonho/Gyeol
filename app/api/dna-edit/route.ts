import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { spendCoinsAtomic, getBalance } from "@/lib/economy/coins";
import { dnaEditBodySchema, parseBody } from "@/lib/validation/schemas";
import {
  calculateEditCost,
  validateEdits,
  applyDNAEdits,
} from "@/lib/genome/dna-editor";
import { type CreatureDNA } from "@/lib/genome/dna";
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

    const parsed = await parseBody(req, dnaEditBodySchema);
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    const { agentId, edits } = parsed.data;

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
      .select("genome")
      .eq("agent_id", agentId)
      .single();

    if (!data) return NextResponse.json({ error: "Agent not found" }, { status: 404 });

    const genome = ((data as Record<string, unknown>).genome ?? {}) as Record<string, unknown>;

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

    // Calculate cost and deduct atomically
    const cost = calculateEditCost(currentDNA, previewDNA);
    const spent = await spendCoinsAtomic(agentId, cost, "dna_edit");
    if (!spent) {
      return NextResponse.json(
        { error: "Not enough coins", required: cost },
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

    // Coins already deducted atomically above — persist genome column (top-level)
    await supabase
      .from("agent_state")
      .update({ genome: updatedGenome })
      .eq("agent_id", agentId);

    const remaining = await getBalance(agentId);
    return NextResponse.json({
      dna: previewDNA,
      species: newSpecies,
      changedAxes,
      coinsSpent: cost,
      coinsRemaining: remaining,
    });
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
