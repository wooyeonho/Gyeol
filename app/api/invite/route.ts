import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { randomBytes } from "crypto";
import { logger } from "@/lib/logger";

function generateCode(): string {
  return randomBytes(6).toString("base64url").toLowerCase().replace(/[+/=]/g, "a");
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const service = createServiceClient();
    const { data: existing } = await service
      .from("invite_codes")
      .select("code")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    let code: string;
    if (existing?.code) {
      code = (existing as { code: string }).code;
    } else {
      code = generateCode();
      await service.from("invite_codes").insert({ user_id: user.id, code });
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "";
    const url = baseUrl ? `${baseUrl}/invite/${code}` : `/invite/${code}`;

    return NextResponse.json({ code, url });
  } catch (e) {
    logger.error("GET /api/invite error", e instanceof Error ? e : { error: e });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
