import { NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code } = await params;
    if (!code) return NextResponse.json({ valid: false }, { status: 404 });

    const service = createServiceClient();
    const { data } = await service
      .from("invite_codes")
      .select("id")
      .eq("code", code.toLowerCase())
      .maybeSingle();

    return NextResponse.json({ valid: Boolean(data) });
  } catch (e) {
    console.error("GET /api/invite/[code] error", e);
    return NextResponse.json({ valid: false }, { status: 500 });
  }
}
