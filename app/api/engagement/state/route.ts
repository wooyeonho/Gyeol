import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { getEngagementState } from "@/lib/engagement/streak-xp";

/**
 * GET /api/engagement/state
 * Returns the current user's streak + XP / level state.
 * Used by the home header, streak widget, and level bar.
 */
export async function GET() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const state = await getEngagementState(user.id);
    return NextResponse.json(state);
  } catch {
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
