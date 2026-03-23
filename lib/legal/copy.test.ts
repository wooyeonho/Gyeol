import { describe, it, expect } from "vitest";
import { getPrivacyPolicy, getTermsOfService } from "./copy";

describe("getPrivacyPolicy", () => {
  it("returns Korean privacy policy for ko locale", () => {
    const doc = getPrivacyPolicy("ko");
    expect(doc.title).toBe("개인정보처리방침");
    expect(doc.sections.length).toBeGreaterThan(0);
    expect(doc.updatedAtValue).toBeTruthy();
  });

  it("returns English privacy policy for en locale", () => {
    const doc = getPrivacyPolicy("en");
    expect(doc.title).toBe("Privacy Policy");
    expect(doc.sections.length).toBeGreaterThan(0);
  });

  it("falls back to English for non-ko locales", () => {
    const ja = getPrivacyPolicy("ja");
    const zh = getPrivacyPolicy("zh");
    expect(ja.title).toBe("Privacy Policy");
    expect(zh.title).toBe("Privacy Policy");
  });

  it("has updatedAtLabel and updatedAtValue", () => {
    const doc = getPrivacyPolicy("ko");
    expect(doc.updatedAtLabel).toBe("최종 업데이트");
    const enDoc = getPrivacyPolicy("en");
    expect(enDoc.updatedAtLabel).toBe("Last updated");
  });

  it("sections have title and body arrays", () => {
    const doc = getPrivacyPolicy("en");
    for (const section of doc.sections) {
      expect(section.title).toBeTruthy();
      expect(Array.isArray(section.body)).toBe(true);
      expect(section.body.length).toBeGreaterThan(0);
    }
  });
});

describe("getTermsOfService", () => {
  it("returns Korean TOS for ko locale", () => {
    const doc = getTermsOfService("ko");
    expect(doc.title).toBe("이용약관");
    expect(doc.sections.length).toBeGreaterThan(0);
  });

  it("returns English TOS for en locale", () => {
    const doc = getTermsOfService("en");
    expect(doc.title).toBe("Terms of Service");
    expect(doc.sections.length).toBeGreaterThan(0);
  });

  it("falls back to English for non-ko locales", () => {
    expect(getTermsOfService("ja").title).toBe("Terms of Service");
    expect(getTermsOfService("es").title).toBe("Terms of Service");
  });

  it("sections have title and body", () => {
    const doc = getTermsOfService("en");
    for (const section of doc.sections) {
      expect(section.title).toBeTruthy();
      expect(section.body.length).toBeGreaterThan(0);
    }
  });
});
