import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export const revalidate = 3600; // ISR: revalidate every hour

export async function GET() {
  try {
    const service = createServiceClient();

    const [agentsRes, messagesRes] = await Promise.all([
      service.from("agents").select("id", { count: "exact", head: true }),
      service.from("messages").select("id", { count: "exact", head: true }),
    ]);

    const agentCount = agentsRes.count ?? 0;
    const messageCount = messagesRes.count ?? 0;

    return NextResponse.json(
      { agentCount, messageCount },
      {
        headers: {
          "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        },
      }
    );
  } catch {
    // Fallback — never expose internal errors to public
    return NextResponse.json(
      { agentCount: 0, messageCount: 0 },
      {
        headers: {
          "Cache-Control": "public, s-maxage=60",
        },
      }
    );
  }
}
