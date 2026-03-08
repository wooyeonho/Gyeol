import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ worldState: null });
    }
    const service = createServiceClient();
    const { data } = await service.from("world_state").select("*").eq("id", "global").single();
    return NextResponse.json({ worldState: data ?? null });
  } catch (e) {
    console.error("GET /api/world/state error", e);
    return NextResponse.json({ worldState: null });
  }
}
