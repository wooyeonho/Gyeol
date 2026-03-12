import { describe, expect, it } from "vitest";
import { canAccessAgent, resolveAuthorizedUserId, type V1ApiKeyContext } from "./v1-auth";

const boundContext: V1ApiKeyContext = {
  id: "key-1",
  identifier: "abc123",
  isLegacyEnvKey: false,
  ownerUserId: "user-1",
};

const legacyContext: V1ApiKeyContext = {
  id: null,
  identifier: "legacy",
  isLegacyEnvKey: true,
  ownerUserId: null,
};

describe("resolveAuthorizedUserId", () => {
  it("uses the bound owner when the request omits user_id", () => {
    expect(resolveAuthorizedUserId(boundContext, null)).toEqual({ userId: "user-1" });
  });

  it("rejects mismatched tenant access", () => {
    expect(resolveAuthorizedUserId(boundContext, "user-2")).toEqual({ error: "FORBIDDEN" });
  });

  it("requires explicit user_id for legacy env keys", () => {
    expect(resolveAuthorizedUserId(legacyContext, null)).toEqual({ error: "MISSING_USER_ID" });
  });
});

describe("canAccessAgent", () => {
  it("allows a bound key to access only owned agents", () => {
    expect(canAccessAgent(boundContext, "user-1")).toBe(true);
    expect(canAccessAgent(boundContext, "user-2")).toBe(false);
  });

  it("keeps legacy env key access for backward-compatible local usage", () => {
    expect(canAccessAgent(legacyContext, "user-1")).toBe(true);
  });
});
