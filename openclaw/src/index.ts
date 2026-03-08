import http from "http";
import { loadConfig } from "./config";
import { startScheduler, runOnce } from "./scheduler";
import { runCrawlCycle } from "./crawler";

const config = loadConfig();

const server = http.createServer((_req, res) => {
  const path = _req.url || "/";

  if (path === "/health" || path === "/") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(
      JSON.stringify({
        ok: true,
        service: "openclaw-engine",
        version: "1.0.0",
        uptime: process.uptime(),
        target: config.appUrl,
        timestamp: new Date().toISOString(),
      })
    );
    return;
  }

  if (path === "/crawl" && _req.method === "POST") {
    runCrawlCycle(config).catch((err) => console.error("[Manual crawl]", err));
    res.writeHead(202, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "crawl_started" }));
    return;
  }

  res.writeHead(404);
  res.end("Not found");
});

const mode = process.argv[2];

if (mode === "run-once") {
  const jobName = process.argv[3];
  runOnce(config, jobName)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
} else if (mode === "crawl") {
  runCrawlCycle(config)
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
} else {
  server.listen(config.port, () => {
    console.log(`[OpenClaw] Health server on :${config.port}`);
    startScheduler(config);
  });
}
