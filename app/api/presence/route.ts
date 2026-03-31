import { NextResponse } from "next/server";
import { getActiveUserCount } from "@/lib/retention/active-counter";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/**
 * GET /api/presence
 *
 * Returns the approximate number of currently active users.
 * Used by the real-time social counter component to show
 * "N people are caring for their creatures right now".
 *
 * Response is intentionally lightweight for frequent polling.
 */
export async function GET() {
  try {
    const count = await getActiveUserCount();
    return NextResponse.json(
      { active: count, ts: Date.now() },
      {
        headers: {
          "Cache-Control": "public, s-maxage=30, stale-while-revalidate=60",
        },
      },
    );
  } catch {
    return NextResponse.json({ active: 3, ts: Date.now() });
  }
}
