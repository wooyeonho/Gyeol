export interface EngineConfig {
  appUrl: string;
  cronSecret: string;
  port: number;
  crawlUrls: string[];
  crawlMaxPages: number;
  crawlDepth: number;
  useHmacAuth: boolean;
}

function warnEnv(key: string): string {
  const val = process.env[key];
  if (!val) {
    console.warn(`[openclaw] WARNING: Missing env var ${key} — some features will be disabled`);
    return "";
  }
  return val;
}

export function loadConfig(): EngineConfig {
  return {
    appUrl: warnEnv("GYEOL_APP_URL").replace(/\/$/, ""),
    cronSecret: warnEnv("CRON_SECRET"),
    port: parseInt(process.env.PORT || "8000", 10),
    crawlUrls: (process.env.CRAWL_URLS || "").split(",").map((u) => u.trim()).filter(Boolean),
    crawlMaxPages: parseInt(process.env.CRAWL_MAX_PAGES || "10", 10),
    crawlDepth: parseInt(process.env.CRAWL_DEPTH || "1", 10),
    useHmacAuth: process.env.USE_HMAC_AUTH === "true",
  };
}
