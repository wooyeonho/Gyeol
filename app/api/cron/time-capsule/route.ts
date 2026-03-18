import { NextRequest, NextResponse } from "next/server";
import { checkCronAuth } from "@/lib/cron-auth";
import { executeTimeCapsule } from "@/lib/cron-core";

export async function GET(request: NextRequest) {
  if (!checkCronAuth(request)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await executeTimeCapsule();
  return NextResponse.json(result);
}

export async function POST(request: NextRequest) {
  return GET(request);
}
