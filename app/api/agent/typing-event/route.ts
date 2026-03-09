import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { checkRateLimit } from "@/lib/rate-limit";

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabase();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const allowed = await checkRateLimit(`typing:${user.id}`);
  if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const isTyping = body?.typing !== false;
  return NextResponse.json({
    ok: true,
    typing: isTyping,
    at: new Date().toISOString(),
  });
}
