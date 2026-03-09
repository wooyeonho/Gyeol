import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

/**
 * Lightweight auth check for client-side guards.
 * Returns 200 with minimal user info if authenticated, 401 otherwise.
 */
export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ id: user.id });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
