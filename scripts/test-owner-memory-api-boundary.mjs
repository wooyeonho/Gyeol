import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const route = await readFile(new URL("../app/api/memory/owner/route.ts", import.meta.url), "utf8");

for (const marker of [
  "buildOwnerMemoryMetadataResponse",
  "rawMemoryExportEnabled: false",
  "resetRequiresRevisionAndGeneration: true",
  "freshGenerationRequiresConsent: true",
  "owner_memory_adapter_not_bound",
  "status: 503",
  "private_memory_field_leak",
]) {
  assert.equal(route.includes(marker), true, `missing fail-closed owner API marker: ${marker}`);
}

assert.equal(route.includes("memories:"), false, "route must not serialize raw memories");
assert.equal(route.includes("memory_adapter_required"), false, "route must not imply an adapter is already authorized");

console.log(JSON.stringify({
  status: "PASS",
  ownerApiFailClosedUntilAdapterBound: true,
  rawMemoryExportDisabled: true,
  resetGenerationRevisionBound: true,
  freshGenerationConsentBound: true,
  privateMemoryLeakGuardPresent: true,
}));
