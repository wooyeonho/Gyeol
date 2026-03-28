import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("@/lib/supabase/service", () => ({ createServiceClient: vi.fn() }));
vi.mock("@/lib/ai/router", () => ({ generateJSON: vi.fn(), generateTextOnce: vi.fn() }));
vi.mock("@/lib/i18n/config", () => ({ getLanguageName: vi.fn().mockReturnValue("Korean") }));
vi.mock("@/lib/i18n/generation", () => ({ resolveGenerationLocale: vi.fn().mockReturnValue("ko") }));

import { createServiceClient } from "@/lib/supabase/service";
import { generateJSON, generateTextOnce } from "@/lib/ai/router";

describe("trySetBirthday", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.resetModules(); });

  it("returns early when state not found", async () => {
    const _updateFn = vi.fn();
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null }) }) }) }),
    });

    const { trySetBirthday } = await import("./birthday");
    await trySetBirthday("agent-1");
    expect(generateJSON).not.toHaveBeenCalled();
  });

  it("returns early when birthday already set", async () => {
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { birthday: { date: "2024-03-15" }, self_name: "Soul", config: {} } }) }) }),
      }),
    });

    const { trySetBirthday } = await import("./birthday");
    await trySetBirthday("agent-1");
    expect(generateJSON).not.toHaveBeenCalled();
  });

  it("returns early when no self_name", async () => {
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { birthday: null, self_name: null, config: {} } }) }) }),
      }),
    });

    const { trySetBirthday } = await import("./birthday");
    await trySetBirthday("agent-1");
    expect(generateJSON).not.toHaveBeenCalled();
  });

  it("sets birthday when valid date returned by AI", async () => {
    (generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue({ date: "2025-06-15", reason: "First meaningful realization" });
    const _updateFn = vi.fn().mockReturnValue({ eq: vi.fn().mockResolvedValue({}) });

    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { birthday: null, self_name: "Soul", config: {} } }) }) }),
        update: _updateFn,
      }),
    });

    const { trySetBirthday } = await import("./birthday");
    await trySetBirthday("agent-1");

    expect(_updateFn).toHaveBeenCalledWith(
      expect.objectContaining({ birthday: expect.objectContaining({ date: "2025-06-15" }) })
    );
  });

  it("does not set birthday when date format is invalid", async () => {
    (generateJSON as ReturnType<typeof vi.fn>).mockResolvedValue({ date: "not-a-date", reason: "reason" });
    const _updateFn = vi.fn();

    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { birthday: null, self_name: "Soul", config: {} } }) }) }),
        update: _updateFn,
      }),
    });

    const { trySetBirthday } = await import("./birthday");
    await trySetBirthday("agent-1");
    expect(_updateFn).not.toHaveBeenCalled();
  });
});

describe("tryBirthdayAnniversary", () => {
  beforeEach(() => { vi.clearAllMocks(); vi.resetModules(); });

  it("returns early when state not found", async () => {
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null }) }) }) }),
    });

    const { tryBirthdayAnniversary } = await import("./birthday");
    await tryBirthdayAnniversary("agent-1");
    expect(generateTextOnce).not.toHaveBeenCalled();
  });

  it("returns early when no birthday set", async () => {
    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: { birthday: null, self_name: "Soul", config: {} } }) }) }) }),
    });

    const { tryBirthdayAnniversary } = await import("./birthday");
    await tryBirthdayAnniversary("agent-1");
    expect(generateTextOnce).not.toHaveBeenCalled();
  });

  it("returns early when anniversary was already done this year", async () => {
    const today = new Date();
    const bday = `2023-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

    (createServiceClient as ReturnType<typeof vi.fn>).mockReturnValue({
      from: vi.fn().mockReturnValue({ select: vi.fn().mockReturnValue({ eq: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({
        data: { birthday: { date: bday }, self_name: "Soul", fragments: [], last_birthday_year: today.getFullYear(), config: {} },
      }) }) }) }),
    });

    const { tryBirthdayAnniversary } = await import("./birthday");
    await tryBirthdayAnniversary("agent-1");
    expect(generateTextOnce).not.toHaveBeenCalled();
  });
});
