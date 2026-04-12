import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { verifyCsrfOrigin } from "@/lib/security/csrf";
import { checkRateLimit } from "@/lib/rate-limit";
import { generateProceduralItem } from "@/lib/game/affix-system";
import { spendCoinsAtomic } from "@/lib/economy/coins";

const LOOT_COST = 50;

/**
 * POST /api/market/loot — Generate a procedural loot item (costs coins).
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

  const allowed = await checkRateLimit(`loot:${user.id}`);
  if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  // Use timestamp + user ID as seed for unique generation
  const seed = `${user.id}-${Date.now()}`;
  const itemLevel = Math.floor(Math.random() * 10) + 1;

  // Charge coins
  const spent = await spendCoinsAtomic(user.id, LOOT_COST, "loot:generate");
  if (!spent) {
    return NextResponse.json({ error: "Not enough coins", required: LOOT_COST }, { status: 402 });
  }

  const item = generateProceduralItem(seed, itemLevel);

  return NextResponse.json({ item, coinsSpent: LOOT_COST });
}
