import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { ensurePrimaryAgent } from "@/lib/agents/primary";
import { randomBytes } from "crypto";

function generateSlug(): string {
  return randomBytes(12).toString("base64url");
}

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const service = createServiceClient();
    const { agentId } = await ensurePrimaryAgent(service, user.id);
    if (!agentId) return NextResponse.json({ error: "No agent" }, { status: 400 });

    const slug = generateSlug();
    await service.from("share_cards").insert({ slug, agent_id: agentId });

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    const url = baseUrl ? `${baseUrl}/share/${slug}` : `/share/${slug}`;

    return NextResponse.json({ url, slug });
  } catch (e) {
    console.error("POST /api/share error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
