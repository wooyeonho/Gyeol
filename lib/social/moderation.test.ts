import { describe, it, expect } from "vitest";
import { moderateSocialContent } from "./moderation";

describe("moderateSocialContent", () => {
  it("approves clean content", () => {
    const result = moderateSocialContent("안녕하세요! 오늘 좋은 하루 되세요.");
    expect(result.status).toBe("approved");
    expect(result.reason).toBeNull();
    expect(result.sanitized).toBeTruthy();
  });

  it("sanitizes HTML tags from input", () => {
    const result = moderateSocialContent("<b>Hello</b> world");
    expect(result.sanitized).toBe("Hello world");
    expect(result.status).toBe("approved");
  });

  it("strips script tags", () => {
    const result = moderateSocialContent("<script>alert('xss')</script>Hello");
    expect(result.sanitized).not.toContain("<script>");
    expect(result.sanitized).toContain("Hello");
  });

  it("blocks empty content after sanitization", () => {
    const result = moderateSocialContent("   ");
    expect(result.status).toBe("blocked");
    expect(result.reason).toBe("empty");
    expect(result.sanitized).toBe("");
  });

  it("blocks empty string", () => {
    const result = moderateSocialContent("");
    expect(result.status).toBe("blocked");
    expect(result.reason).toBe("empty");
  });

  it("blocks high-risk violence content in English", () => {
    const result = moderateSocialContent("I want to kill myself");
    expect(result.status).toBe("blocked");
    expect(result.reason).toBe("high_risk_content");
  });

  it("blocks suicide content in English", () => {
    const result = moderateSocialContent("I feel like suicide is the only way");
    expect(result.status).toBe("blocked");
    expect(result.reason).toBe("high_risk_content");
  });

  it("blocks self-harm content in English", () => {
    const result = moderateSocialContent("self-harm is not the answer");
    expect(result.status).toBe("blocked");
    expect(result.reason).toBe("high_risk_content");
  });

  it("blocks child sexual exploitation content in English", () => {
    const result = moderateSocialContent("child sexual content is wrong");
    expect(result.status).toBe("blocked");
    expect(result.reason).toBe("high_risk_content");
  });

  it("blocks electric fence violations", () => {
    const result = moderateSocialContent("run sudo rm -rf /");
    expect(result.status).toBe("blocked");
    expect(result.reason).toBe("Blocked by safety rules");
  });

  it("blocks SQL injection via electric fence", () => {
    const result = moderateSocialContent("DROP TABLE users");
    expect(result.status).toBe("blocked");
    expect(result.reason).toBe("Blocked by safety rules");
  });

  it("returns sanitized text even when blocked by electric fence", () => {
    const result = moderateSocialContent("<b>DROP TABLE users</b>");
    expect(result.status).toBe("blocked");
    expect(result.sanitized).toBe("DROP TABLE users");
  });

  it("normalizes multiple spaces to single space", () => {
    const result = moderateSocialContent("Hello    world   here");
    expect(result.sanitized).toBe("Hello world here");
  });
});
