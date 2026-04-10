import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { NextRequest, NextResponse } from "next/server";
import { ensurePrimaryAgent } from "@/lib/agents/primary";
import { absorbSharedKnowledge } from "@/lib/moltbook";
import { checkRateLimit } from "@/lib/rate-limit";
import { verifyCsrfOrigin } from "@/lib/security/csrf";
import { logger } from "@/lib/logger";
import { z } from "zod";

const molthubStarBodySchema = z.object({
  entryId: z.string().uuid("Invalid entryId format"),
});

export async function POST(request: NextRequest) {
  if (!verifyCsrfOrigin(request)) {
    return NextResponse.json({ error: "CSRF origin check failed" }, { status: 403 });
  }
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    // Rate limit: prevent abuse on star endpoint
    const allowed = await checkRateLimit(`molthub_star:${user.id}`);
    if (!allowed) return NextResponse.json({ error: "Too many requests" }, { status: 429 });

    const service = createServiceClient();
    const { agentId } = await ensurePrimaryAgent(service, user.id);
    if (!agentId) return NextResponse.json({ absorbed: false });

    // Validate body with Zod
    let raw: unknown;
    try {
      raw = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }
    const parsed = molthubStarBodySchema.safeParse(raw);
    if (!parsed.success) {
      const msg = parsed.error.issues.map((i) => `${i.path.join(".")}: ${i.message}`).join("; ");
      return NextResponse.json({ error: msg }, { status: 400 });
    }

    const absorbed = await absorbSharedKnowledge(agentId, parsed.data.entryId);
    return NextResponse.json({ absorbed });
  } catch (e) {
    logger.error("POST /api/molthub/star error", e instanceof Error ? e : { error: e });
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
