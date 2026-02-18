FROM node:24-slim AS base

RUN corepack enable pnpm

WORKDIR /app

# Install dependencies
FROM base AS deps
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile --prod

# Build
FROM base AS build
COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile
COPY tsconfig.json biome.json ./
COPY src/ src/
COPY scripts/ scripts/
RUN pnpm build

# Production
FROM base AS production

ENV NODE_ENV=production

COPY --from=deps /app/node_modules ./node_modules
COPY --from=build /app/bin ./bin
COPY --from=build /app/build ./build
COPY package.json ./

# Create symlink for global CLI access
RUN ln -s /app/bin/cli.mjs /usr/local/bin/better-godot-mcp

USER node

ENTRYPOINT ["node", "bin/cli.mjs"]
