import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { applyInviteCodeForUser } from "@/lib/invite/apply";
import { verifyCsrfOrigin } from "@/lib/security/csrf";
import { checkRateLimit } from "@/lib/rate-limit";
import { inviteApplyBodySchema, parseBody } from "@/lib/validation/schemas";
import { logger } from "@/lib/logger";

const log = logger.child({ route: "api/invite/apply" });

export async function POST(request: NextRequest) {
  if (!verifyCsrfOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const allowed = await checkRateLimit(`invite-apply:${user.id}`);
    if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const parsed = await parseBody(request, inviteApplyBodySchema);
    if (!parsed.success) return NextResponse.json({ error: parsed.error }, { status: 400 });
    const code = parsed.data.code;
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
    log.error("POST failed", e instanceof Error ? e : { detail: String(e) });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
