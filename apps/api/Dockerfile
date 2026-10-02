# Build from the repo root:  docker build -f apps/api/Dockerfile .
FROM node:24-slim
RUN apt-get update \
 && apt-get install -y --no-install-recommends chromium fonts-noto-core fonts-noto-unhinted ca-certificates openssl \
 && rm -rf /var/lib/apt/lists/*
ENV CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium \
    HOST=0.0.0.0 \
    NODE_ENV=production
RUN corepack enable
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/package.json
RUN pnpm install --frozen-lockfile --filter @lawmedy/api... --prod=false
COPY apps/api apps/api
RUN pnpm --filter @lawmedy/api build
WORKDIR /app/apps/api
EXPOSE 4000
# Apply pending migrations (uses DIRECT_URL), then start the API.
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/main.js"]
