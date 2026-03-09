import { NextRequest, NextResponse } from "next/server";

// TODO: War event logic - tribe vs tribe, resolve outcomes
function checkCronAuth(req: NextRequest): boolean {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const auth = req.headers.get("authorization")?.replace("Bearer ", "");
  return auth === secret;
}

export async function GET(req: NextRequest) {
  if (!process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Service not configured" }, { status: 503 });
  }
  if (!checkCronAuth(req)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ processed: 0 });
}
