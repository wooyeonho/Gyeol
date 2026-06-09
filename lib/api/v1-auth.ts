import crypto from "crypto";
import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";
import { logger } from "@/lib/logger";

type ApiKeyRow = {
  id?: string;
  key_hash?: string;
  is_active?: boolean;
  owner_user_id?: string | null;
  scope?: string[] | null;
  scopes?: string[] | null;
};

export type V1ApiKeyContext = {
  id: string | null;
  identifier: string;
  isLegacyEnvKey: boolean;
  ownerUserId: string | null;
};

function getRawApiKey(request: NextRequest): string {
  return (
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    request.headers.get("x-api-key") ||
    ""
  ).trim();
}

function hasScope(row: ApiKeyRow, requiredScope: string): boolean {
  const scopes = Array.isArray(row.scope)
    ? row.scope
    : Array.isArray(row.scopes)
      ? row.scopes
      : [];
  if (scopes.length === 0) return false; // default-deny: empty scopes = no permissions
  return scopes.includes("v1") || scopes.includes(requiredScope);
}

export async function verifyV1ApiKey(request: NextRequest, requiredScope: string): Promise<boolean> {
  return Boolean(await authorizeV1ApiKey(request, requiredScope));
}

export async function authorizeV1ApiKey(
  request: NextRequest,
  requiredScope: string
): Promise<V1ApiKeyContext | null> {
  const raw = getRawApiKey(request);
  if (!raw) return null;

  const keyHash = crypto.createHash("sha256").update(raw).digest("hex");
  const service = createServiceClient();

  const { data } = await service
    .from("api_keys")
    .select("*")
    .eq("key_hash", keyHash)
    .limit(1)
    .maybeSingle();

  const row = (data ?? null) as ApiKeyRow | null;
  if (row?.id) {
    if (row.is_active === false) return null;
    if (!hasScope(row, requiredScope)) return null;
    Promise.resolve(
      service
        .from("api_keys")
        .update({ last_used_at: new Date().toISOString() })
        .eq("id", row.id)
    ).then(({ error: updateErr }: { error: { message: string } | null }) => {
      if (updateErr) logger.warn("[V1Auth] last_used_at update failed", { error: updateErr.message });
    }).catch((err: unknown) => logger.warn("[V1Auth] last_used_at update failed", { error: err instanceof Error ? err.message : String(err) }));
    return {
      id: row.id,
      identifier: getApiKeyIdentifier(request),
      isLegacyEnvKey: false,
      ownerUserId: row.owner_user_id ?? null,
    };
  }

  return null;
}

export function getApiKeyIdentifier(request: NextRequest): string {
  const raw = getRawApiKey(request);
  if (!raw) return "anonymous";
  return crypto.createHash("sha256").update(raw).digest("hex").slice(0, 16);
}

export function resolveAuthorizedUserId(
  context: V1ApiKeyContext,
  requestedUserId: string | null | undefined
): { error?: "FORBIDDEN" | "MISSING_TENANT" | "MISSING_USER_ID"; userId?: string } {
  if (context.ownerUserId) {
    if (requestedUserId && requestedUserId !== context.ownerUserId) {
      return { error: "FORBIDDEN" };
    }
    return { userId: context.ownerUserId };
  }

  return { error: "MISSING_TENANT" };
}

export function canAccessAgent(context: V1ApiKeyContext, ownerUserId: string | null | undefined): boolean {
  if (!ownerUserId) return false;
  return Boolean(context.ownerUserId) && context.ownerUserId === ownerUserId;
}
