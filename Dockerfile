# Better Godot MCP - Composite MCP Server for Godot Engine
# syntax=docker/dockerfile:1

# Build stage
FROM oven/bun:latest AS builder

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

# Production stage
FROM node:24.14.1-alpine

LABEL org.opencontainers.image.source="https://github.com/n24q02m/better-godot-mcp"
LABEL io.modelcontextprotocol.server.name="io.github.n24q02m/better-godot-mcp"

COPY --from=builder /app/build /usr/local/lib/node_modules/@n24q02m/better-godot-mcp/build
COPY --from=builder /app/bin /usr/local/lib/node_modules/@n24q02m/better-godot-mcp/bin
COPY --from=builder /app/package.json /usr/local/lib/node_modules/@n24q02m/better-godot-mcp/
COPY --from=builder /app/node_modules /usr/local/lib/node_modules/@n24q02m/better-godot-mcp/node_modules

RUN ln -s /usr/local/lib/node_modules/@n24q02m/better-godot-mcp/bin/cli.mjs /usr/local/bin/better-godot-mcp \
    && chmod +x /usr/local/lib/node_modules/@n24q02m/better-godot-mcp/bin/cli.mjs

ENV NODE_ENV=production

USER node

ENTRYPOINT ["node", "/usr/local/lib/node_modules/@n24q02m/better-godot-mcp/bin/cli.mjs"]
