import { describe, expect, it } from "vitest";
import { evaluateLowDeviceProfile } from "./use-device-performance";

describe("evaluateLowDeviceProfile", () => {
  it("marks save-data sessions as low device mode", () => {
    expect(
      evaluateLowDeviceProfile({
        userAgent: "Mozilla/5.0",
        hardwareConcurrency: 8,
        deviceMemory: 8,
        prefersReducedMotion: false,
        saveData: true,
        effectiveType: "4g",
      }),
    ).toBe(true);
  });

  it("marks slow mobile devices as low device mode", () => {
    expect(
      evaluateLowDeviceProfile({
        userAgent: "Mozilla/5.0 (Linux; Android 10)",
        hardwareConcurrency: 4,
        deviceMemory: 2,
        prefersReducedMotion: false,
        saveData: false,
        effectiveType: "3g",
      }),
    ).toBe(true);
  });

  it("keeps capable desktops on full mode", () => {
    expect(
      evaluateLowDeviceProfile({
        userAgent: "Mozilla/5.0 (X11; Linux x86_64)",
        hardwareConcurrency: 8,
        deviceMemory: 16,
        prefersReducedMotion: false,
        saveData: false,
        effectiveType: "4g",
      }),
    ).toBe(false);
  });
});
