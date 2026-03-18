import { NextRequest } from "next/server";
import { checkCronAuth } from "@/lib/cron-auth";
import { executeLearner } from "@/lib/cron-core";

export async function GET(request: NextRequest) {
  if (!checkCronAuth(request)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  const result = await executeLearner();
  return new Response(JSON.stringify(result), {
    status: result.statusCode ?? (result.error ? 500 : 200),
    headers: { "Content-Type": "application/json" },
  });
}

export async function POST(request: NextRequest) {
  if (!checkCronAuth(request)) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  let body: unknown = null;
  try {
    body = await request.json().catch(() => null);
  } catch {
    // empty body ok
  }
  const result = await executeLearner(body);
  return new Response(JSON.stringify(result), {
    status: result.statusCode ?? (result.error ? 500 : 200),
    headers: { "Content-Type": "application/json" },
  });
}
