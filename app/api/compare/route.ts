import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export type CompareResult = {
  mine: CompareAgent;
  opponent: CompareAgent;
  axes: CompareAxis[];
  verdict: { winner: "mine" | "opponent" | "tie"; label: string };
};

export type CompareAgent = {
  self_name: string | null;
  gen_level: number;
  vitality: number;
  total_messages: number;
  visual: { color?: string; shape?: string } | null;
  config: { usage_profile?: { primary_mode?: string | null } | null } | null;
};

export type CompareAxis = {
  key: string;
  label: string;
  mine: number;
  opponent: number;
  winner: "mine" | "opponent" | "tie";
};

function buildAxes(mine: CompareAgent, opponent: CompareAgent): CompareAxis[] {
  const axes: CompareAxis[] = [
    {
      key: "gen_level",
      label: "Gen Level",
      mine: mine.gen_level,
      opponent: opponent.gen_level,
      winner: mine.gen_level > opponent.gen_level ? "mine" : mine.gen_level < opponent.gen_level ? "opponent" : "tie",
    },
    {
      key: "vitality",
      label: "Vitality",
      mine: Math.round(mine.vitality * 100),
      opponent: Math.round(opponent.vitality * 100),
      winner: mine.vitality > opponent.vitality ? "mine" : mine.vitality < opponent.vitality ? "opponent" : "tie",
    },
    {
      key: "total_messages",
      label: "Messages",
      mine: mine.total_messages,
      opponent: opponent.total_messages,
      winner:
        mine.total_messages > opponent.total_messages
          ? "mine"
          : mine.total_messages < opponent.total_messages
            ? "opponent"
            : "tie",
    },
  ];
  return axes;
}

function pickVerdict(axes: CompareAxis[]): CompareResult["verdict"] {
  let mineWins = 0;
  let opponentWins = 0;
  for (const a of axes) {
    if (a.winner === "mine") mineWins++;
    else if (a.winner === "opponent") opponentWins++;
  }
  if (mineWins > opponentWins) return { winner: "mine", label: "You win!" };
  if (opponentWins > mineWins) return { winner: "opponent", label: "Opponent wins!" };
  return { winner: "tie", label: "It's a tie!" };
}

function toCompareAgent(row: Record<string, unknown>): CompareAgent {
  return {
    self_name: (row.self_name as string) ?? null,
    gen_level: (row.gen_level as number) ?? 1,
    vitality: (row.vitality as number) ?? 1,
    total_messages: (row.total_messages as number) ?? 0,
    visual: (row.visual as CompareAgent["visual"]) ?? null,
    config: (row.config as CompareAgent["config"]) ?? null,
  };
}

export async function GET(_request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const service = createServiceClient();

    // Get my agent
    const { data: myAgent } = await service
      .from("agent_state")
      .select("self_name, gen_level, vitality, total_messages, visual, config, agent_id")
      .eq("agent_id", (await service.from("agents").select("id").eq("user_id", user.id).limit(1).single()).data?.id ?? "")
      .single();

    if (!myAgent) return NextResponse.json({ error: "No agent found" }, { status: 404 });

    // Pick random opponent (different from mine)
    const agentId = (myAgent as Record<string, unknown>).agent_id as string;
    const { data: opponents } = await service
      .from("agent_state")
      .select("self_name, gen_level, vitality, total_messages, visual, config")
      .neq("agent_id", agentId)
      .order("total_messages", { ascending: false })
      .limit(50);

    if (!opponents || opponents.length === 0) {
      return NextResponse.json({ error: "No opponents available" }, { status: 404 });
    }

    // Pick random from top 50
    const randomIndex = Math.floor(Math.random() * opponents.length);
    const opponent = opponents[randomIndex];

    const mine = toCompareAgent(myAgent as Record<string, unknown>);
    const opp = toCompareAgent(opponent as Record<string, unknown>);
    const axes = buildAxes(mine, opp);
    const verdict = pickVerdict(axes);

    const result: CompareResult = { mine, opponent: opp, axes, verdict };
    return NextResponse.json(result);
  } catch (e) {
    console.error("GET /api/compare error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
