export const maxDuration = 60;
import { NextRequest, NextResponse } from "next/server";
import { checkCronAuth } from "@/lib/cron-auth";
import { executeWorld } from "@/lib/cron-core";

export async function GET(request: NextRequest) {
  if (!checkCronAuth(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await executeWorld();
  return NextResponse.json(result);
}

export const POST = GET;
