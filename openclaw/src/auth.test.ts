import crypto from "crypto";
import { describe, expect, it, vi } from "vitest";
import { buildAuthHeaders } from "./auth";

describe("buildAuthHeaders", () => {
  it("returns bearer auth when hmac disabled", () => {
    expect(buildAuthHeaders("secret-token", false)).toEqual({
      Authorization: "Bearer secret-token",
    });
  });

  it("returns signed hmac headers when enabled", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00.000Z"));

    const headers = buildAuthHeaders("secret-token", true);
    const expectedTimestamp = String(new Date("2026-01-01T00:00:00.000Z").getTime());
    const expectedSignature = crypto
      .createHmac("sha256", "secret-token")
      .update(expectedTimestamp)
      .digest("hex");

    expect(headers).toEqual({
      "X-Cron-Signature": expectedSignature,
      "X-Cron-Timestamp": expectedTimestamp,
    });

    vi.useRealTimers();
  });
});
