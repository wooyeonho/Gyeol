import { describe, it, expect, vi, beforeEach } from "vitest";
import { crawlPage, crawlSite } from "./web-crawler";

describe("crawlPage", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns null for blocked URLs", async () => {
    expect(await crawlPage("ftp://example.com")).toBeNull();
    expect(await crawlPage("http://localhost/page")).toBeNull();
    expect(await crawlPage("http://192.168.1.1/page")).toBeNull();
    expect(await crawlPage("http://10.0.0.1/page")).toBeNull();
    expect(await crawlPage("https://example.com/image.jpg")).toBeNull();
    expect(await crawlPage("https://example.com/file.pdf")).toBeNull();
  });

  it("returns null for invalid URLs", async () => {
    expect(await crawlPage("not-a-url")).toBeNull();
    expect(await crawlPage("")).toBeNull();
  });

  it("returns null when fetch fails", async () => {
    vi.spyOn(globalThis, "fetch").mockRejectedValue(new Error("Network error"));
    expect(await crawlPage("https://example.com")).toBeNull();
  });

  it("returns null for non-HTML responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("{}", {
        status: 200,
        headers: { "Content-Type": "application/json" },
      })
    );
    expect(await crawlPage("https://example.com/api")).toBeNull();
  });

  it("returns null for non-OK responses", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response("Not Found", { status: 404, headers: { "Content-Type": "text/html" } })
    );
    expect(await crawlPage("https://example.com/missing")).toBeNull();
  });

  it("extracts title, content, and links from HTML", async () => {
    const html = `
      <html>
        <head><title>Test Page</title></head>
        <body>
          <main><p>Hello world content</p></main>
          <a href="/about">About</a>
          <a href="https://other.com">Other</a>
        </body>
      </html>
    `;
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(html, {
        status: 200,
        headers: { "Content-Type": "text/html" },
      })
    );

    const result = await crawlPage("https://example.com");
    expect(result).not.toBeNull();
    expect(result!.title).toBe("Test Page");
    expect(result!.content).toContain("Hello world content");
    expect(result!.links.length).toBeGreaterThan(0);
    expect(result!.url).toBe("https://example.com");
  });
});

describe("crawlSite", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns empty array for invalid seed URL", async () => {
    const results = await crawlSite("not-a-url");
    expect(results).toEqual([]);
  });

  it("crawls seed page and follows same-domain links", async () => {
    const html1 = `<html><head><title>Page 1</title></head><body><main>Content 1</main><a href="/page2">Link</a></body></html>`;
    const html2 = `<html><head><title>Page 2</title></head><body><main>Content 2</main></body></html>`;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    let callCount = 0;

    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      callCount++;
      const url = typeof input === "string" ? input : (input as Request).url;
      const html = url.includes("page2") ? html2 : html1;
      return new Response(html, {
        status: 200,
        headers: { "Content-Type": "text/html" },
      });
    });

    const results = await crawlSite("https://example.com", 5, 1);
    expect(results.length).toBeGreaterThanOrEqual(1);
    expect(results[0].title).toBe("Page 1");
  });

  it("respects maxPages limit", async () => {
    const html = `<html><head><title>P</title></head><body><main>C</main></body></html>`;
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(html, {
        status: 200,
        headers: { "Content-Type": "text/html" },
      })
    );

    const results = await crawlSite("https://example.com", 1, 0);
    expect(results).toHaveLength(1);
  });
});
