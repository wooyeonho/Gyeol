FROM node:22-slim

RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install dependencies (openclaw + gyeol deps)
COPY openclaw/package.json openclaw/package-lock.json* ./openclaw/
RUN cd openclaw && npm install --omit=dev
# Symlink node_modules to root so lib/ imports resolve correctly
RUN ln -s /app/openclaw/node_modules /app/node_modules

# Copy parent lib/, store/, types/, messages/ for direct execution imports
COPY lib/ lib/
COPY store/ store/
COPY types/ types/
COPY messages/ messages/

# Copy OpenClaw config, workspace files, and source
COPY openclaw/openclaw.json5 openclaw/openclaw.json5
COPY openclaw/HEARTBEAT.md openclaw/HEARTBEAT.md
COPY openclaw/AGENT.md openclaw/AGENT.md
COPY openclaw/skills/ openclaw/skills/
COPY openclaw/tsconfig.json openclaw/tsconfig.json
COPY openclaw/src/ openclaw/src/

# Build TypeScript
RUN cd openclaw && npm run build

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -sf http://localhost:8000/health || curl -sf http://localhost:8000/gyeol/health || exit 1

# Start: OpenClaw gateway with Gyeol plugin
CMD ["node", "openclaw/dist/openclaw/src/index.js"]
