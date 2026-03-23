import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  MissingEnvError,
  missingEnv,
  hasRequiredEnv,
  assertRequiredEnv,
  isMissingEnvError,
} from "./required";

describe("MissingEnvError", () => {
  it("has correct properties", () => {
    const err = new MissingEnvError(["FOO", "BAR"], "test");
    expect(err.name).toBe("MissingEnvError");
    expect(err.code).toBe("MISSING_ENV");
    expect(err.missing).toEqual(["FOO", "BAR"]);
    expect(err.message).toContain("FOO");
    expect(err.message).toContain("BAR");
    expect(err.message).toContain("for test");
  });

  it("omits scope label when not provided", () => {
    const err = new MissingEnvError(["X"]);
    expect(err.message).not.toContain("for ");
    expect(err.message).toContain("X");
  });
});

describe("missingEnv", () => {
  const origEnv = { ...process.env };
  beforeEach(() => {
    process.env = { ...origEnv };
  });
  afterEach(() => {
    process.env = origEnv;
  });

  it("returns missing keys", () => {
    delete process.env.TEST_MISSING_1;
    delete process.env.TEST_MISSING_2;
    const result = missingEnv(["TEST_MISSING_1", "TEST_MISSING_2"]);
    expect(result).toEqual(["TEST_MISSING_1", "TEST_MISSING_2"]);
  });

  it("returns empty array when all present", () => {
    process.env.TEST_PRESENT = "value";
    expect(missingEnv(["TEST_PRESENT"])).toEqual([]);
  });

  it("treats empty strings as missing", () => {
    process.env.TEST_EMPTY = "";
    expect(missingEnv(["TEST_EMPTY"])).toEqual(["TEST_EMPTY"]);
  });

  it("treats 'your-' prefixed values as missing", () => {
    process.env.TEST_YOUR = "your-key-here";
    expect(missingEnv(["TEST_YOUR"])).toEqual(["TEST_YOUR"]);
  });
});

describe("hasRequiredEnv", () => {
  const origEnv = { ...process.env };
  beforeEach(() => {
    process.env = { ...origEnv };
  });
  afterEach(() => {
    process.env = origEnv;
  });

  it("returns true when all present", () => {
    process.env.TEST_HAS = "val";
    expect(hasRequiredEnv(["TEST_HAS"])).toBe(true);
  });

  it("returns false when any missing", () => {
    delete process.env.TEST_HAS_MISSING;
    expect(hasRequiredEnv(["TEST_HAS_MISSING"])).toBe(false);
  });
});

describe("assertRequiredEnv", () => {
  const origEnv = { ...process.env };
  beforeEach(() => {
    process.env = { ...origEnv };
  });
  afterEach(() => {
    process.env = origEnv;
  });

  it("does not throw when all present", () => {
    process.env.TEST_ASSERT = "val";
    expect(() => assertRequiredEnv(["TEST_ASSERT"])).not.toThrow();
  });

  it("throws MissingEnvError when missing", () => {
    delete process.env.TEST_ASSERT_MISSING;
    expect(() => assertRequiredEnv(["TEST_ASSERT_MISSING"], "test-scope")).toThrow(MissingEnvError);
  });
});

describe("isMissingEnvError", () => {
  it("returns true for MissingEnvError", () => {
    expect(isMissingEnvError(new MissingEnvError(["X"]))).toBe(true);
  });

  it("returns false for regular errors", () => {
    expect(isMissingEnvError(new Error("generic"))).toBe(false);
  });

  it("returns false for non-error values", () => {
    expect(isMissingEnvError("string")).toBe(false);
    expect(isMissingEnvError(null)).toBe(false);
    expect(isMissingEnvError(undefined)).toBe(false);
  });
});
