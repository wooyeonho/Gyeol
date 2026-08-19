import { NextResponse } from "next/server";
import {
  exportOwnerMemoryMetadata,
  summarizeOwnerMemoryState,
} from "../../../../lib/identity/memory-owner-controls.mjs";

const PRIVATE_KEYS = new Set(["memories", "memory", "text", "content", "id", "memoryId"]);

function hasPrivateMemoryFields(value: unknown): boolean {
  if (!value || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some(hasPrivateMemoryFields);
  return Object.entries(value as Record<string, unknown>).some(
    ([key, child]) => PRIVATE_KEYS.has(key) || hasPrivateMemoryFields(child),
  );
}

export function buildOwnerMemoryMetadataResponse(readResult: unknown) {
  const summary = summarizeOwnerMemoryState(readResult);
  const body = JSON.parse(exportOwnerMemoryMetadata(readResult));
  if (hasPrivateMemoryFields(body)) {
    throw new Error("private_memory_field_leak");
  }
  return Object.freeze({
    ...summary,
    controls: Object.freeze({
      resetRequiresRevisionAndGeneration: true,
      freshGenerationRequiresConsent: true,
      rawMemoryExportEnabled: false,
    }),
  });
}

export async function GET() {
  // Branch-only owner-control boundary. Authentication and persistence binding
  // remain fail-closed until an authorized adapter is explicitly wired.
  return NextResponse.json(
    { ok: false, reason: "owner_memory_adapter_not_bound" },
    { status: 503 },
  );
}
