FROM node:20-slim

RUN apt-get update && apt-get install -y --no-install-recommends curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY openclaw/package.json openclaw/package-lock.json* ./openclaw/
RUN cd openclaw && npm ci
# Symlink node_modules to root so lib/ imports resolve correctly
RUN ln -s /app/openclaw/node_modules /app/node_modules

# Copy parent lib/, store/, types/, messages/ for direct execution imports
COPY lib/ lib/
COPY store/ store/
COPY types/ types/
COPY messages/ messages/
COPY openclaw/tsconfig.json openclaw/tsconfig.json
COPY openclaw/src/ openclaw/src/

RUN cd openclaw && npm run build
RUN cd openclaw && npm prune --omit=dev

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -sf http://localhost:8000/health || exit 1

CMD ["node", "openclaw/dist/openclaw/src/index.js"]
