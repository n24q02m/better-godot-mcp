# Better Godot MCP - Composite MCP Server for Godot Engine
# Multi-target Dockerfile: `:stdio` (default for clients) + `:http` (self-hosted daemon).
# See spec 2026-04-30-multi-mode-stdio-http-architecture.md.
# syntax=docker/dockerfile:1

# Build stage (shared by both targets)
FROM oven/bun:1-alpine@sha256:07235578f79ef8c6f97d94aee7938e76f5cdba5f21ae5dbfdd3d3d38058437eb AS builder

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

# Base runtime stage (shared)
FROM node:24.20.0-alpine@sha256:e67514e5d0f6c46656005e1b693b2ec9d52e80b641307de684d4a015ba7a4eaf AS base

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

# stdio target: direct MCP SDK StdioServerTransport (no daemon hop).
# Intended for `docker run --rm -i n24q02m/better-godot-mcp:stdio` from MCP clients.
FROM base AS stdio
ENV MCP_TRANSPORT=stdio
ENTRYPOINT ["node", "/usr/local/lib/node_modules/@n24q02m/better-godot-mcp/bin/cli.mjs"]

# http target: HTTP daemon (runHttpServer). Self-hosted deployment.
FROM base AS http
ENV MCP_TRANSPORT=http
ENV PORT=8000
EXPOSE 8000
ENTRYPOINT ["node", "/usr/local/lib/node_modules/@n24q02m/better-godot-mcp/bin/cli.mjs"]
