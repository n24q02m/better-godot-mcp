# Better Godot MCP - Composite MCP Server for Godot Engine
# syntax=docker/dockerfile:1

# Build stage
FROM oven/bun:1-alpine@sha256:26d8996560ca94eab9ce48afc0c7443825553c9a851f40ae574d47d20906826d AS builder

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
