import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { applyInviteCodeForUser } from "@/lib/invite/apply";

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
    const result = await applyInviteCodeForUser(service, user.id, code);
    if (!result.ok) {
      if (result.error === "INVALID_CODE") {
        return NextResponse.json({ error: "Invalid code" }, { status: 400 });
      }
      return NextResponse.json({ error: "Cannot self-refer" }, { status: 400 });
    }

    return NextResponse.json({ ok: true, rewarded_coins: result.rewardedCoins });
  } catch (e) {
    console.error("POST /api/invite/apply error", e);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
