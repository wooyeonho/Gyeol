import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const accessToken = typeof body?.access_token === "string" ? body.access_token : null;
    if (!accessToken) return NextResponse.json({ error: "access_token required" }, { status: 400 });

    const service = createServiceClient();
    await service.from("user_connections").upsert(
      {
        user_id: user.id,
        service: "slack",
        token_encrypted: accessToken,
        metadata: body?.channel_id ? { channel_id: body.channel_id } : {},
      },
      { onConflict: "user_id,service" }
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("integrations/slack POST", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
