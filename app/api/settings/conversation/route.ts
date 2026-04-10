import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";

const schema = z.object({
  tone_serious_humorous: z.number().min(-1).max(1).optional(),
  tone_warm_logical: z.number().min(-1).max(1).optional(),
  tone_brief_detailed: z.number().min(-1).max(1).optional(),
  response_language: z.enum(["ko", "en", "auto"]).optional(),
  restricted_topics: z.array(z.string()).max(20).optional(),
});

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data } = await supabase
    .from("conversation_settings")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();

  return NextResponse.json(data ?? {
    tone_serious_humorous: 0,
    tone_warm_logical: 0,
    tone_brief_detailed: 0,
    response_language: "ko",
    restricted_topics: [],
  });
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = schema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten() }, { status: 400 });

  const { error } = await supabase.from("conversation_settings").upsert(
    { user_id: user.id, ...parsed.data, updated_at: new Date().toISOString() },
    { onConflict: "user_id" },
  );

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
