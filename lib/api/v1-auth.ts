import crypto from "crypto";
import { NextRequest } from "next/server";
import { createServiceClient } from "@/lib/supabase/service";

type ApiKeyRow = {
  id?: string;
  key_hash?: string;
  is_active?: boolean;
  scope?: string[] | null;
  scopes?: string[] | null;
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
  if (scopes.length === 0) return true;
  return scopes.includes("v1") || scopes.includes(requiredScope);
}

export async function verifyV1ApiKey(request: NextRequest, requiredScope: string): Promise<boolean> {
  const raw = getRawApiKey(request);
  if (!raw) return false;

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
    if (row.is_active === false) return false;
    if (!hasScope(row, requiredScope)) return false;
    service
      .from("api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", row.id)
      .then(() => {});
    return true;
  }

  // Backward compatibility: legacy single env key.
  const envKey = process.env.GYEOL_ENGINE_API_KEY;
  return Boolean(envKey) && raw === envKey;
}

export function getApiKeyIdentifier(request: NextRequest): string {
  const raw = getRawApiKey(request);
  if (!raw) return "anonymous";
  return crypto.createHash("sha256").update(raw).digest("hex").slice(0, 16);
}
