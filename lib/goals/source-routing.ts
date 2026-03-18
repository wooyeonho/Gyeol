const SOURCE_CATALOG = [
  // Tech & AI
  {
    keywords: ["ai", "llm", "model", "agent", "prompt", "gpt", "claude", "gemini", "machine learning"],
    urls: ["https://openai.com/news/", "https://www.anthropic.com/news", "https://huggingface.co/blog"],
  },
  {
    keywords: ["design", "ui", "ux", "brand", "product", "figma", "typography"],
    urls: ["https://www.figma.com/blog/", "https://www.smashingmagazine.com/feed/"],
  },
  {
    keywords: ["startup", "growth", "marketing", "acquisition", "founder", "venture", "fundraise"],
    urls: ["https://techcrunch.com", "https://www.ycombinator.com/blog", "https://andrewchen.com/"],
  },
  {
    keywords: ["engineering", "backend", "database", "infra", "devops", "performance", "api"],
    urls: ["https://martinfowler.com/", "https://vercel.com/blog", "https://supabase.com/blog"],
  },
  // Science & Knowledge
  {
    keywords: ["science", "physics", "biology", "chemistry", "space", "nasa", "research", "paper"],
    urls: ["https://www.nature.com/nature.rss", "https://arxiv.org/rss/cs.AI", "https://www.sciencedaily.com/rss/all.xml"],
  },
  {
    keywords: ["philosophy", "ethics", "consciousness", "mind", "existential", "meaning"],
    urls: ["https://dailynous.com/feed/", "https://aeon.co/feed.rss"],
  },
  // Creative & Media
  {
    keywords: ["music", "song", "album", "artist", "spotify", "concert", "genre", "playlist"],
    urls: ["https://pitchfork.com/feed/feed-news/rss", "https://www.stereogum.com/feed/"],
  },
  {
    keywords: ["film", "movie", "cinema", "director", "series", "netflix", "anime"],
    urls: ["https://www.indiewire.com/feed/", "https://letterboxd.com/crew/rss/"],
  },
  {
    keywords: ["art", "illustration", "painting", "gallery", "creative", "visual"],
    urls: ["https://www.thisiscolossal.com/feed/", "https://www.creativebloq.com/feed"],
  },
  {
    keywords: ["gaming", "game", "esports", "steam", "nintendo", "playstation", "xbox"],
    urls: ["https://www.polygon.com/rss/index.xml", "https://kotaku.com/rss"],
  },
  // Lifestyle
  {
    keywords: ["cooking", "recipe", "food", "restaurant", "chef", "baking"],
    urls: ["https://www.seriouseats.com/feeds/serious-eats", "https://minimalistbaker.com/feed/"],
  },
  {
    keywords: ["health", "fitness", "exercise", "mental health", "meditation", "wellness", "sleep"],
    urls: ["https://www.health.harvard.edu/blog/feed", "https://greatist.com/feed"],
  },
  {
    keywords: ["travel", "trip", "country", "city", "backpack", "flight", "hotel"],
    urls: ["https://www.lonelyplanet.com/feed.xml", "https://nomadicmatt.com/feed/"],
  },
  {
    keywords: ["finance", "investing", "stock", "crypto", "money", "economy", "budget"],
    urls: ["https://www.bloomberg.com/feed/podcast"],
  },
  // Korean specific
  {
    keywords: ["kpop", "kdrama", "webtoon", "manhwa"],
    urls: ["https://www.allkpop.com/feed", "https://www.soompi.com/feed"],
  },
];

export function getSeedUrlsForTask(taskTitle: string | null | undefined, fallbackUrls: string[]): string[] {
  if (!taskTitle) return fallbackUrls;
  const lower = taskTitle.toLowerCase();

  // Collect all matching categories (not just first match)
  const matchedUrls: string[] = [];
  for (const entry of SOURCE_CATALOG) {
    const matchCount = entry.keywords.filter((keyword) => lower.includes(keyword)).length;
    if (matchCount > 0) {
      matchedUrls.push(...entry.urls);
    }
  }

  if (matchedUrls.length === 0) return fallbackUrls;
  return [...new Set([...matchedUrls, ...fallbackUrls])];
}
