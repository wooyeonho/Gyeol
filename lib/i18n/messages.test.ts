import { describe, it, expect } from "vitest";
import { loadMessages, getNested } from "./messages";

describe("loadMessages", () => {
  it("loads Korean messages", async () => {
    const messages = await loadMessages("ko");
    expect(messages).toBeDefined();
    expect(typeof messages).toBe("object");
  });

  it("loads English messages", async () => {
    const messages = await loadMessages("en");
    expect(messages).toBeDefined();
  });

  it("loads Japanese messages", async () => {
    const messages = await loadMessages("ja");
    expect(messages).toBeDefined();
  });

  it("loads Chinese messages", async () => {
    const messages = await loadMessages("zh");
    expect(messages).toBeDefined();
  });

  it("loads Spanish messages", async () => {
    const messages = await loadMessages("es");
    expect(messages).toBeDefined();
  });
});

describe("getNested", () => {
  it("retrieves nested values by dot path", () => {
    const obj = { a: { b: { c: "deep" } } };
    expect(getNested(obj as Record<string, unknown>, "a.b.c")).toBe("deep");
  });

  it("returns undefined for missing paths", () => {
    const obj = { a: { b: "value" } };
    expect(getNested(obj as Record<string, unknown>, "a.c")).toBeUndefined();
    expect(getNested(obj as Record<string, unknown>, "x.y.z")).toBeUndefined();
  });

  it("returns undefined for non-string leaf values", () => {
    const obj = { a: { b: 42 } };
    expect(getNested(obj as Record<string, unknown>, "a.b")).toBeUndefined();
  });

  it("returns string value at top level", () => {
    const obj = { hello: "world" };
    expect(getNested(obj, "hello")).toBe("world");
  });

  it("handles empty path segments gracefully", () => {
    const obj = { a: "val" };
    expect(getNested(obj, "")).toBeUndefined();
  });
});
