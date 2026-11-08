# Single isolated image that runs the whole AgentGate demo (5 services).
# Base image ships Chromium for the Playwright-driven agent runner.
FROM mcr.microsoft.com/playwright:v1.49.1-noble

RUN apt-get update \
  && apt-get install -y --no-install-recommends build-essential python3 sqlite3 \
  && rm -rf /var/lib/apt/lists/*
RUN npm i -g pnpm@9.15.0

WORKDIR /app
ENV REPO_ROOT=/app \
    NEXT_TELEMETRY_DISABLED=1

# Install dependencies first (cached unless a package.json changes)
COPY package.json pnpm-workspace.yaml .npmrc ./
COPY apps/console/package.json apps/console/
COPY apps/gateway/package.json apps/gateway/
COPY apps/flydemo/package.json apps/flydemo/
COPY apps/shopdemo/package.json apps/shopdemo/
COPY apps/agent/package.json apps/agent/
COPY packages/shared/package.json packages/shared/
RUN pnpm install

COPY . .
RUN pnpm build

EXPOSE 3000 3100 4001 4002
CMD ["pnpm", "start"]
