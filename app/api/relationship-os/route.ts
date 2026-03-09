import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";
import { isMissingEnvError } from "@/lib/env/required";
import { normalizeRelationshipSnapshot } from "@/lib/relationship-os/snapshot";

type SandboxShape = {
  relationship_os?: {
    snapshot?: unknown;
    updated_at?: string;
    version?: number;
  };
  [key: string]: unknown;
};

async function getOrCreateAgentId(userId: string): Promise<string | null> {
  const service = createServiceClient();
  const { data: existing } = await service
    .from("agents")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();

  if (existing?.id) return String(existing.id);

  const { data: created } = await service
    .from("agents")
    .insert({ user_id: userId })
    .select("id")
    .single();

  if (!created?.id) return null;

  try {
    await service.from("agent_state").insert({ agent_id: created.id });
  } catch {
    // ignore race conditions when agent_state was created elsewhere
  }

  return String(created.id);
}

export async function GET() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ snapshot: null }, { status: 401 });

    const agentId = await getOrCreateAgentId(user.id);
    if (!agentId) return NextResponse.json({ snapshot: null }, { status: 500 });

    const service = createServiceClient();
    const { data: state } = await service
      .from("agent_state")
      .select("sandbox")
      .eq("agent_id", agentId)
      .single();

    const sandbox = ((state as { sandbox?: SandboxShape } | null)?.sandbox ?? {}) as SandboxShape;
    const snapshot = sandbox.relationship_os?.snapshot
      ? normalizeRelationshipSnapshot(sandbox.relationship_os.snapshot)
      : null;

    return NextResponse.json({
      snapshot,
      updated_at: sandbox.relationship_os?.updated_at ?? null,
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
    const agentId = await getOrCreateAgentId(user.id);
    if (!agentId) return NextResponse.json({ error: "Could not initialize agent" }, { status: 500 });

    const service = createServiceClient();
    const { data: state } = await service
      .from("agent_state")
      .select("sandbox, config")
      .eq("agent_id", agentId)
      .single();

    const sandbox = ((state as { sandbox?: SandboxShape } | null)?.sandbox ?? {}) as SandboxShape;
    const config = ((state as { config?: Record<string, unknown> } | null)?.config ?? {}) as Record<string, unknown>;
    const updatedAt = new Date().toISOString();

    const nextSandbox: SandboxShape = {
      ...sandbox,
      relationship_os: {
        snapshot,
        updated_at: updatedAt,
        version: 1,
      },
    };

    await service
      .from("agent_state")
      .update({
        sandbox: nextSandbox,
        promises: snapshot.promises,
        config: {
          ...config,
          relationship_os_focus: snapshot.autonomousMode.currentFocus,
          relationship_os_last_sync_at: updatedAt,
        },
        updated_at: updatedAt,
      })
      .eq("agent_id", agentId);

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
