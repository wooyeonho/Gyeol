import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { verifyCsrfOrigin } from "@/lib/security/csrf";
import { checkRateLimit } from "@/lib/rate-limit";
import { battleActionBodySchema, parseBody } from "@/lib/validation/schemas";
import { calculateBattleResult, updateEloRating, type BattleCreature } from "@/lib/game/pvp-system";
import { calculateCombo, type MoveType } from "@/lib/game/combo-system";
import type { CreatureStats } from "@/lib/game/stat-system";
import type { DominantType } from "@/lib/game/type-advantage";

/**
 * POST /api/room/battle — Execute a turn-based battle action.
 * Body: { agentId, opponentId, moveType }
 */
export async function POST(req: NextRequest) {
  if (!verifyCsrfOrigin(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const authClient = await createServerSupabase();
  const {
    data: { user },
  } = await authClient.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const allowed = await checkRateLimit(`battle:${user.id}`);
  if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const parsed = await parseBody(req, battleActionBodySchema);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const { agentId, opponentId, moveType } = parsed.data;

  const service = createServiceClient();

  // Load both creatures
  const { data: agents } = await service
    .from("agents")
    .select("id, name, config:agent_state(config)")
    .in("id", [agentId, opponentId]);

  if (!agents || agents.length < 2) {
    return NextResponse.json({ error: "Creatures not found" }, { status: 404 });
  }

  const attackerAgent = agents.find((a) => a.id === agentId);
  const defenderAgent = agents.find((a) => a.id === opponentId);
  if (!attackerAgent || !defenderAgent) {
    return NextResponse.json({ error: "Creatures not found" }, { status: 404 });
  }

  // Extract stats (with safe defaults)
  function extractCreature(agent: NonNullable<typeof attackerAgent>): BattleCreature {
    const config = ((agent.config as unknown as { config: Record<string, unknown> }[])?.[0]?.config ?? {}) as Record<string, unknown>;
    const stats = (config.stats ?? { hp: 20, atk: 10, def: 8, spd: 8, wis: 6, cha: 5 }) as CreatureStats;
    const dominantType = ((config.dominant_type as string) ?? "balanced") as DominantType;
    const level = (config.level as number) ?? 1;
    return { name: agent.name ?? "Creature", stats, dominantType, level };
  }

  const attacker = extractCreature(attackerAgent);
  const defender = extractCreature(defenderAgent);

  // Calculate combo from recent moves (stored in battle session)
  const recentMoves: MoveType[] = [moveType as MoveType];
  const combo = calculateCombo(recentMoves);

  // Execute battle
  const outcome = calculateBattleResult(attacker, defender);

  // Update Elo ratings
  const attackerRating = 1000; // Would load from DB in production
  const defenderRating = 1000;
  const { newWinner, newLoser } = updateEloRating(
    outcome.winner === attacker ? attackerRating : defenderRating,
    outcome.winner === attacker ? defenderRating : attackerRating,
  );

  return NextResponse.json({
    outcome: {
      winner: outcome.winner.name,
      loser: outcome.loser.name,
      highlights: outcome.highlights,
      winnerDamage: outcome.winnerDamageDealt,
      loserDamage: outcome.loserDamageDealt,
    },
    combo: combo.comboName ? { name: combo.comboName, multiplier: combo.multiplier } : null,
    ratings: {
      winner: newWinner,
      loser: newLoser,
    },
  });
}
