import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

function checkCronAuth(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization")?.replace("Bearer ", "");
  return auth === secret;
}

export async function GET() {
  try {
    const db = createServiceClient();
    const { data: event } = await db
      .from("war_events")
      .select("id, side_a, side_b, side_a_score, side_b_score, ends_at, status")
      .eq("status", "active")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    return NextResponse.json(event ?? null);
  } catch (e) {
    console.error("war GET", e);
    return NextResponse.json(null);
  }
}

export async function POST(req: NextRequest) {
  if (!checkCronAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  // Placeholder for scheduled war resolution/update job.
  return NextResponse.json({ processed: 0 });
}
