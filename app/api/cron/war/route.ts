import { NextRequest } from "next/server";
import { checkCronAuth } from "@/lib/cron-auth";
import { executeWar } from "@/lib/cron-core";

export async function GET(request: NextRequest) {
  if (!checkCronAuth(request)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  const result = await executeWar();
  return new Response(JSON.stringify(result), {
    headers: { "Content-Type": "application/json" },
  });
}

export const POST = GET;
