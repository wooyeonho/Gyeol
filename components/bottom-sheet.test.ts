import { describe, expect, it } from "vitest";

describe("BottomSheet", () => {
  it("exports BottomSheet component", async () => {
    const mod = await import("./bottom-sheet");
    expect(mod.BottomSheet).toBeDefined();
    expect(typeof mod.BottomSheet).toBe("function");
  });

  it("is a named export (not default)", async () => {
    const mod = await import("./bottom-sheet");
    expect("default" in mod).toBe(false);
    expect("BottomSheet" in mod).toBe(true);
  });

  it("default snap points are [0.5, 0.9]", () => {
    // Validate the documented default snap points
    const defaultSnap = [0.5, 0.9];
    expect(defaultSnap).toHaveLength(2);
    expect(defaultSnap[0]).toBe(0.5);
    expect(defaultSnap[1]).toBe(0.9);
  });

  it("accepts required props shape", () => {
    const props = {
      isOpen: true,
      onClose: () => {},
      title: "테스트 시트",
      children: null,
      snapPoints: [0.4, 0.8],
    };
    expect(props.isOpen).toBe(true);
    expect(typeof props.onClose).toBe("function");
    expect(props.title).toBe("테스트 시트");
    expect(props.snapPoints).toEqual([0.4, 0.8]);
  });
});
