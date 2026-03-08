import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

// TODO: War event logic - tribe vs tribe, resolve outcomes
function checkCronAuth(req: NextRequest): boolean {
  const auth = req.headers.get("authorization")?.replace("Bearer ", "");
  return auth === process.env.CRON_SECRET;
}

export async function GET(req: NextRequest) {
  if (!checkCronAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ processed: 0 });
}
