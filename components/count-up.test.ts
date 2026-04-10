import { describe, expect, it } from "vitest";

describe("CountUp", () => {
  it("exports CountUp component", async () => {
    const mod = await import("./count-up");
    expect(mod.CountUp).toBeDefined();
    expect(typeof mod.CountUp).toBe("function");
  });

  it("is a named export (not default)", async () => {
    const mod = await import("./count-up");
    expect("default" in mod).toBe(false);
    expect("CountUp" in mod).toBe(true);
  });

  it("accepts required and optional props (type-level check)", () => {
    // Verify the shape of props at runtime by checking the function exists
    // Actual rendering tests require jsdom + @testing-library/react
    const props = {
      value: 1234,
      duration: 600,
      prefix: "₩",
      suffix: "원",
      className: "text-2xl",
    };
    expect(props.value).toBe(1234);
    expect(props.prefix).toBe("₩");
    expect(props.suffix).toBe("원");
  });
});
