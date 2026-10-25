# Build from the repo root:  docker build -f apps/api/Dockerfile .
FROM node:24-slim
RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates openssl \
 && rm -rf /var/lib/apt/lists/*
ENV HOST=0.0.0.0 \
    NODE_ENV=production \
    NODE_OPTIONS=--max-old-space-size=512
RUN corepack enable
WORKDIR /app
COPY pnpm-lock.yaml pnpm-workspace.yaml package.json ./
COPY apps/api/package.json apps/api/package.json
RUN pnpm install --frozen-lockfile --filter @lawmedy/api... --prod=false
COPY apps/api apps/api
RUN pnpm --filter @lawmedy/api build
RUN pnpm --filter @lawmedy/api deploy --legacy --prod /runtime
WORKDIR /runtime
RUN node node_modules/prisma/build/index.js generate

FROM node:24-trixie-slim AS runtime
RUN apt-get update \
 && apt-get upgrade -y \
 && apt-get install -y --no-install-recommends ca-certificates openssl \
 && rm -rf /var/lib/apt/lists/* \
    /usr/local/lib/node_modules/npm /usr/local/lib/node_modules/corepack /opt/yarn* \
 && rm -f /usr/local/bin/npm /usr/local/bin/npx /usr/local/bin/corepack \
    /usr/local/bin/yarn /usr/local/bin/yarnpkg /usr/local/bin/pnpm /usr/local/bin/pnpx
ENV HOST=0.0.0.0 NODE_ENV=production
WORKDIR /app
COPY --from=0 --chown=node:node /runtime ./
RUN mkdir -p /var/lib/lawmedy/private \
 && chown -R node:node /var/lib/lawmedy \
 && chmod 700 /var/lib/lawmedy/private
USER node
EXPOSE 4000
# Apply pending migrations (uses DIRECT_URL), then start the API.
CMD ["sh", "-c", "node node_modules/prisma/build/index.js migrate deploy && exec node dist/main.js"]
