// Vercel Pro max. Dream loops through all agents; cron-lock prevents double-run with OpenClaw.
export const maxDuration = 300;
import { NextRequest, NextResponse } from "next/server";
import { checkCronAuth } from "@/lib/cron-auth";
import { executeDream } from "@/lib/cron-core";

export async function GET(request: NextRequest) {
  if (!checkCronAuth(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await executeDream();
  return NextResponse.json(result);
}

export const POST = GET;
