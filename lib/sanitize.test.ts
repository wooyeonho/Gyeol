import { describe, expect, it } from "vitest";
import { sanitizeUserInput } from "./sanitize";

describe("sanitizeUserInput", () => {
  it("removes script tags and html tags", () => {
    const raw = '<script>alert("x")</script><b>Hello</b> world';
    expect(sanitizeUserInput(raw)).toBe("Hello world");
  });

  it("removes javascript protocol payload", () => {
    const raw = "javascript:alert(1)";
    expect(sanitizeUserInput(raw)).toBe("alert(1)");
  });

  it("trims whitespace", () => {
    const raw = "   hello   ";
    expect(sanitizeUserInput(raw)).toBe("hello");
  });
});
