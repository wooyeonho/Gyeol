import { NextRequest } from "next/server";
import { checkCronAuth } from "@/lib/cron-auth";
import { executeRedemption } from "@/lib/cron-core";

export async function GET(request: NextRequest) {
  if (!checkCronAuth(request)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  const result = await executeRedemption();
  return new Response(JSON.stringify(result), {
    status: result.error ? 500 : 200,
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(request: NextRequest) {
  return GET(request);
}
