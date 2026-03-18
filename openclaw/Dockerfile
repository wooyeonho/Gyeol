FROM node:20-slim

RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY openclaw/package.json openclaw/package-lock.json* ./openclaw/
RUN cd openclaw && npm ci

# Copy parent lib/ and store/ for direct execution imports
COPY lib/ lib/
COPY store/ store/
COPY openclaw/tsconfig.json openclaw/tsconfig.json
COPY openclaw/src/ openclaw/src/

RUN cd openclaw && npm run build
RUN cd openclaw && npm prune --omit=dev

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -sf http://localhost:8000/health || exit 1

CMD ["node", "openclaw/dist/openclaw/src/index.js"]
