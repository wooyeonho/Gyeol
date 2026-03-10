import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const code = typeof body?.code === "string" ? body.code.trim().toLowerCase() : null;
    if (!code) return NextResponse.json({ error: "code required" }, { status: 400 });

    const service = createServiceClient();
    const { data: inviteRow } = await service
      .from("invite_codes")
      .select("user_id")
      .eq("code", code)
      .maybeSingle();

    if (!inviteRow) return NextResponse.json({ error: "Invalid code" }, { status: 400 });

    const inviterId = (inviteRow as { user_id: string }).user_id;
    if (inviterId === user.id) return NextResponse.json({ error: "Cannot self-refer" }, { status: 400 });

    await service.from("referrals").upsert(
      {
        inviter_id: inviterId,
        invitee_id: user.id,
        code,
      },
      { onConflict: "invitee_id" }
    );

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("POST /api/invite/apply error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
