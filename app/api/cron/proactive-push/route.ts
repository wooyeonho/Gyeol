import { NextRequest, NextResponse } from "next/server";
import { checkCronAuth } from "@/lib/cron-auth";
import { executeProactivePush } from "@/lib/cron-core";

export async function GET(request: NextRequest) {
  if (!checkCronAuth(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await executeProactivePush();
  return NextResponse.json(result, { status: result.error ? 500 : 200 });
}

export async function POST(request: NextRequest) {
  if (!checkCronAuth(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await executeProactivePush();
  return NextResponse.json(result, { status: result.error ? 500 : 200 });
}
