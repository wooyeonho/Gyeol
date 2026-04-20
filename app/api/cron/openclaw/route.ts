// OpenClaw deep DNA analysis cron endpoint.
// Runs every 4 hours via OpenClaw scheduler (gyeol_openclaw job).
// maxDuration: 60s — batch is capped at 200 agents × 20 interactions each.
export const maxDuration = 60;

import { NextRequest, NextResponse } from "next/server";
import { checkCronAuth } from "@/lib/cron-auth";
import { executeOpenclawDna } from "@/lib/cron-core";

export async function GET(request: NextRequest) {
  if (!checkCronAuth(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await executeOpenclawDna();
  return NextResponse.json(result);
}

export const POST = GET;
