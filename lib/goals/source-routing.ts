const SOURCE_CATALOG = [
  {
    keywords: ["ai", "llm", "모델", "에이아이", "agent", "prompt"],
    urls: ["https://openai.com/news/", "https://www.anthropic.com/news", "https://huggingface.co/blog"],
  },
  {
    keywords: ["디자인", "ui", "ux", "brand", "브랜드", "product"],
    urls: ["https://www.designsystems.com/", "https://www.figma.com/blog/", "https://www.smashingmagazine.com/category/uxdesign/"],
  },
  {
    keywords: ["start", "startup", "growth", "마케팅", "확산", "growth", "acquisition"],
    urls: ["https://techcrunch.com", "https://www.ycombinator.com/blog", "https://andrewchen.com/"],
  },
  {
    keywords: ["개발", "engineering", "backend", "database", "infra", "성능", "performance"],
    urls: ["https://martinfowler.com/", "https://vercel.com/blog", "https://supabase.com/blog"],
  },
];

export function getSeedUrlsForTask(taskTitle: string | null | undefined, fallbackUrls: string[]) {
  if (!taskTitle) return fallbackUrls;
  const lower = taskTitle.toLowerCase();
  const matched = SOURCE_CATALOG.find((entry) => entry.keywords.some((keyword) => lower.includes(keyword)));
  if (!matched) return fallbackUrls;
  return [...new Set([...matched.urls, ...fallbackUrls])];
}
