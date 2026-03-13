import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextResponse } from "next/server";
import { getDemoWorldState } from "@/lib/demo/runtime";
import { isMissingEnvError } from "@/lib/env/required";

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
    if (isMissingEnvError(e)) {
      return NextResponse.json({ worldState: getDemoWorldState(), demo_mode: true });
    }
    return NextResponse.json({ worldState: null });
  }
}
