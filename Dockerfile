# Better Godot MCP - Composite MCP Server for Godot Engine
# syntax=docker/dockerfile:1

# Build stage
FROM oven/bun:1-alpine@sha256:4de475389889577f346c636f956b42a5c31501b654664e9ae5726f94d7bb5349 AS builder

WORKDIR /app

COPY package.json bun.lock ./
RUN bun install --frozen-lockfile

COPY . .
RUN bun run build

# Production stage
FROM node:24.15.0-alpine@sha256:d1b3b4da11eefd5941e7f0b9cf17783fc99d9c6fc34884a665f40a06dbdfc94f

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
