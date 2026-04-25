# CLAUDE.md - better-godot-mcp

MCP Server cho Godot Engine. TypeScript, Node.js >= 24, bun, ESM.
17 composite mega-tools cho game development. Zod v4 schema validation.
Dual-mode: HTTP (default) + stdio (backward compat via `--stdio` flag or `MCP_TRANSPORT=stdio`).

## Commands

```bash
# Setup
bun install

# Lint & Type check
bun run check                    # biome check + tsc --noEmit
bun run lint                     # biome check .

# Fix
bun run check:fix                # auto-fix biome

# Test
bun run test                     # vitest run
bun run test:watch               # vitest watch
bun x vitest run tests/helpers/errors.test.ts     # single file
bun x vitest run -t "test name"                   # single test

# Build & Dev
bun run build                    # tsc --build + esbuild CLI bundle
bun run dev                      # tsx watch dev server (HTTP mode, default)
bun run dev:http                 # tsx watch dev server (HTTP mode, explicit)
bun run dev:stdio                # tsx watch dev server (stdio mode)

# Mise shortcuts
mise run setup     # full dev setup
mise run lint      # bun run check
mise run test      # vitest
mise run fix       # bun run check:fix
```

## Cau truc thu muc

```
src/
  init-server.ts                 # Entry point, transport mode detection
  transports/
    stdio.ts                     # Stdio transport (backward compat)
    http.ts                      # HTTP transport (StreamableHTTPServerTransport, no auth)
  godot/                         # Binary detection, headless execution, types
  tools/
    registry.ts                  # Tool definitions (P0-P3 priority) + routing
    composite/                   # 1 file per mega-tool (17 tools)
    helpers/                     # errors.ts, scene-parser.ts, godot-types.ts, project-settings.ts
tests/
  fixtures.ts                    # Shared fixtures
  helpers/                       # Unit tests
  composite/                     # Integration tests
```

## Env vars

- `GODOT_PROJECT_PATH` -- default project path (tools cung nhan `project_path` param)
- `GODOT_PATH` -- duong dan toi Godot binary (auto-detect neu khong set)
- `MCP_TRANSPORT` -- `stdio` de dung stdio mode (default: HTTP)
- `PORT` -- HTTP port (default: 0 = auto-assign)

## Code conventions

- Biome: 2 spaces, 120 line width, single quotes, semicolons as needed
- Import: `node:` prefix cho builtins, `.js` extension bat buoc (ESM/NodeNext)
- `import type` bat buoc cho type-only imports (`verbatimModuleSyntax`)
- Error handling: `GodotMCPError` + `withErrorHandling()` HOF wrapper
- Tool/param names: snake_case. Files: kebab-case.

## CD Pipeline

PSR v10 (workflow_dispatch) -> npm + Docker (amd64+arm64) + GHCR + MCP Registry.

## Luu y

- Yeu cau Godot 4.x project structure.
- Scene files (.tscn) xu ly bang text manipulation, khong qua Godot internal API.
- `run`/`stop`/`export` actions can Godot binary.
- Docker mode: mount project directory de truy cap filesystem.
- Tiered descriptions: Tier 1 (compact, luon load) + Tier 2 (full docs qua `help` tool).
- Pre-commit: biome check, tsc --noEmit. Pre-push: bun test.
- Secrets: skret SSM namespace `/better-godot-mcp/prod` (region `ap-southeast-1`)

## Known bugs (potential -- E2E test chua chay den godot 2026-04-18)

Godot MCP dung `@n24q02m/mcp-core` (core-ts) -- co the bi affect boi upstream core-ts bug:

1. **Browser UI stuck "Waiting for server..." sau khi submit credentials** (neu co relay flow). See `C:\Users\n24q02m-wlap\projects\mcp-core\CLAUDE.md` Known bugs #2.
2. **Config storage path**: `$APPDATA\mcp\Config\config.enc` (khac Python servers `$LOCALAPPDATA\mcp\config.enc`).

Khi E2E test godot, can clean state tai `$APPDATA\mcp\Config\` + check browser behavior.
