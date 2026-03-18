import { describe, it, expect } from "vitest";
import { getSeedUrlsForTask } from "./source-routing";

const FALLBACK_URLS = ["https://fallback.com/news"];

describe("getSeedUrlsForTask", () => {
  it("returns fallback URLs when taskTitle is null", () => {
    expect(getSeedUrlsForTask(null, FALLBACK_URLS)).toEqual(FALLBACK_URLS);
  });

  it("returns fallback URLs when taskTitle is undefined", () => {
    expect(getSeedUrlsForTask(undefined, FALLBACK_URLS)).toEqual(FALLBACK_URLS);
  });

  it("returns fallback URLs when no keywords match", () => {
    const result = getSeedUrlsForTask("random unrelated topic", FALLBACK_URLS);
    expect(result).toEqual(FALLBACK_URLS);
  });

  it("returns AI/LLM URLs for 'ai' keyword", () => {
    const result = getSeedUrlsForTask("AI 트렌드 분석", FALLBACK_URLS);
    expect(result).toContain("https://www.anthropic.com/news");
    expect(result).toContain("https://openai.com/news/");
  });

  it("returns AI/LLM URLs for 'llm' keyword", () => {
    const result = getSeedUrlsForTask("LLM 비교 분석", FALLBACK_URLS);
    expect(result).toContain("https://huggingface.co/blog");
  });

  it("returns AI/LLM URLs for 'agent' keyword", () => {
    const result = getSeedUrlsForTask("Autonomous agent 구현", FALLBACK_URLS);
    expect(result).toContain("https://openai.com/news/");
  });

  it("returns design URLs for 'ui' keyword", () => {
    const result = getSeedUrlsForTask("UI 디자인 가이드", FALLBACK_URLS);
    expect(result).toContain("https://www.figma.com/blog/");
  });

  it("returns design URLs for 'brand' keyword", () => {
    const result = getSeedUrlsForTask("Brand identity redesign", FALLBACK_URLS);
    expect(result).toContain("https://www.figma.com/blog/");
  });

  it("returns startup URLs for 'startup' keyword", () => {
    const result = getSeedUrlsForTask("startup growth strategy", FALLBACK_URLS);
    expect(result).toContain("https://techcrunch.com");
    expect(result).toContain("https://www.ycombinator.com/blog");
  });

  it("returns startup URLs for 'marketing' keyword", () => {
    const result = getSeedUrlsForTask("marketing strategy planning", FALLBACK_URLS);
    expect(result).toContain("https://andrewchen.com/");
  });

  it("returns engineering URLs for 'backend' keyword", () => {
    const result = getSeedUrlsForTask("backend performance optimization", FALLBACK_URLS);
    expect(result).toContain("https://vercel.com/blog");
    expect(result).toContain("https://supabase.com/blog");
  });

  it("returns engineering URLs for 'devops' keyword", () => {
    const result = getSeedUrlsForTask("devops pipeline automation", FALLBACK_URLS);
    expect(result).toContain("https://martinfowler.com/");
  });

  it("returns startup URLs for Korean 마케팅 keyword", () => {
    const result = getSeedUrlsForTask("마케팅 전략 수립", FALLBACK_URLS);
    expect(result).toContain("https://andrewchen.com/");
  });

  it("returns engineering URLs for Korean 개발 keyword", () => {
    const result = getSeedUrlsForTask("개발 생산성 향상 방법", FALLBACK_URLS);
    expect(result).toContain("https://martinfowler.com/");
  });

  it("returns multiple category URLs when keywords overlap", () => {
    const result = getSeedUrlsForTask("AI model performance engineering", FALLBACK_URLS);
    // Should match both AI and engineering categories
    expect(result).toContain("https://openai.com/news/");
    expect(result).toContain("https://martinfowler.com/");
  });

  it("returns science URLs for 'science' keyword", () => {
    const result = getSeedUrlsForTask("science research papers", FALLBACK_URLS);
    expect(result).toContain("https://www.nature.com/nature.rss");
  });

  it("returns music URLs for 'music' keyword", () => {
    const result = getSeedUrlsForTask("music album reviews", FALLBACK_URLS);
    expect(result).toContain("https://pitchfork.com/feed/feed-news/rss");
  });

  it("returns cooking URLs for 'recipe' keyword", () => {
    const result = getSeedUrlsForTask("easy recipe ideas", FALLBACK_URLS);
    expect(result).toContain("https://minimalistbaker.com/feed/");
  });

  it("includes fallback URLs alongside matched URLs", () => {
    const result = getSeedUrlsForTask("AI 모델 비교", FALLBACK_URLS);
    expect(result).toContain(FALLBACK_URLS[0]);
  });

  it("deduplicates URLs when fallback overlaps with catalog", () => {
    const overlap = ["https://openai.com/news/"];
    const result = getSeedUrlsForTask("AI 트렌드", overlap);
    const count = result.filter((url) => url === "https://openai.com/news/").length;
    expect(count).toBe(1);
  });
});
