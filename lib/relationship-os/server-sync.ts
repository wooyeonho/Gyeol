import { createServiceClient } from "@/lib/supabase/service";
import { normalizeRelationshipSnapshot } from "@/lib/relationship-os/snapshot";
import type { RelationshipOSSnapshot } from "@/lib/relationship-os/types";

type ServiceClient = ReturnType<typeof createServiceClient>;

type SandboxShape = {
  relationship_os?: {
    snapshot?: unknown;
    updated_at?: string;
    version?: number;
  };
  [key: string]: unknown;
};

export async function getOrCreateAgentIdForUser(service: ServiceClient, userId: string): Promise<string | null> {
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
    // ignore race conditions
  }

  return String(created.id);
}

export async function loadRelationshipSnapshotForAgent(
  service: ServiceClient,
  agentId: string,
): Promise<RelationshipOSSnapshot | null> {
  const { data: state } = await service
    .from("agent_state")
    .select("sandbox")
    .eq("agent_id", agentId)
    .single();

  const sandbox = ((state as { sandbox?: SandboxShape } | null)?.sandbox ?? {}) as SandboxShape;
  return sandbox.relationship_os?.snapshot
    ? normalizeRelationshipSnapshot(sandbox.relationship_os.snapshot)
    : null;
}

export async function saveRelationshipSnapshotForAgent(
  service: ServiceClient,
  agentId: string,
  snapshot: RelationshipOSSnapshot,
  extraConfig: Record<string, unknown> = {},
): Promise<string> {
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
        ...extraConfig,
      },
      updated_at: updatedAt,
    })
    .eq("agent_id", agentId);

  return updatedAt;
}
