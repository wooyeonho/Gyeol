import { createServiceClient } from "@/lib/supabase/service";
import { logger } from "@/lib/logger";

type UserLike = {
  id?: string | null;
};

/**
 * Legacy env-based admin check (fallback).
 * Prefer DB-based check via isOpsAdminUserFromDb().
 */
function getOpsAdminUserIds() {
  return (process.env.OPS_ADMIN_USER_IDS ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

/**
 * Check if user is an ops admin.
 * Uses DB-based RBAC (ops_admin_roles table) with env-var fallback.
 */
export async function isOpsAdminUserAsync(user: UserLike | null | undefined): Promise<boolean> {
  if (!user?.id) return false;

  // Try DB-based check first
  try {
    const service = createServiceClient();
    const { data, error } = await service
      .from("ops_admin_roles")
      .select("role")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();

    if (!error && data) return true;
  } catch {
    // DB check failed, fall through to env-based check
  }

  // Fallback: env-based check (for backwards compatibility)
  const adminIds = getOpsAdminUserIds();
  return adminIds.length > 0 && adminIds.includes(user.id);
}

/**
 * Synchronous check (legacy, uses env vars only).
 * Kept for call sites that cannot be made async.
 */
export function isOpsAdminUser(user: UserLike | null | undefined) {
  const adminIds = getOpsAdminUserIds();
  if (adminIds.length === 0) return false;
  return Boolean(user?.id && adminIds.includes(user.id));
}

/**
 * Record an ops admin action in the audit log.
 */
export async function logOpsAudit(opts: {
  userId: string;
  action: string;
  resource?: string;
  metadata?: Record<string, unknown>;
  ipAddress?: string;
}) {
  try {
    const service = createServiceClient();
    await service.from("ops_audit_log").insert({
      user_id: opts.userId,
      action: opts.action,
      resource: opts.resource ?? null,
      metadata: opts.metadata ?? {},
      ip_address: opts.ipAddress ?? null,
    });
  } catch (e) {
    logger.error("[OpsAudit] Failed to write audit log", e instanceof Error ? e : { error: e });
  }
}
