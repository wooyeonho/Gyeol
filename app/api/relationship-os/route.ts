import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isMissingEnvError } from "@/lib/env/required";
import { normalizeRelationshipSnapshot } from "@/lib/relationship-os/snapshot";
import {
  getOrCreateAgentIdForUser,
  loadRelationshipSnapshotForAgent,
  saveRelationshipSnapshotForAgent,
} from "@/lib/relationship-os/server-sync";

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ snapshot: null }, { status: 401 });

    const service = createServiceClient();
    const agentId = await getOrCreateAgentIdForUser(service, user.id);
    if (!agentId) return NextResponse.json({ snapshot: null }, { status: 500 });

    const snapshot = await loadRelationshipSnapshotForAgent(service, agentId);

    return NextResponse.json({
      snapshot,
      updated_at: snapshot?.autonomousMode?.lastRunAt ?? null,
      storage: snapshot ? "sandbox.relationship_os" : "none",
    });
  } catch (error) {
    console.error("GET /api/relationship-os error", error);
    if (isMissingEnvError(error)) {
      return NextResponse.json(
        { error: "Service unavailable: missing server configuration", code: "MISSING_ENV" },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json().catch(() => ({}));
    const snapshot = normalizeRelationshipSnapshot(body?.snapshot ?? body);
    const service = createServiceClient();
    const agentId = await getOrCreateAgentIdForUser(service, user.id);
    if (!agentId) return NextResponse.json({ error: "Could not initialize agent" }, { status: 500 });

    const updatedAt = await saveRelationshipSnapshotForAgent(service, agentId, snapshot);

    return NextResponse.json({ ok: true, updated_at: updatedAt, storage: "sandbox.relationship_os" });
  } catch (error) {
    console.error("PUT /api/relationship-os error", error);
    if (isMissingEnvError(error)) {
      return NextResponse.json(
        { error: "Service unavailable: missing server configuration", code: "MISSING_ENV" },
        { status: 503 },
      );
    }
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
