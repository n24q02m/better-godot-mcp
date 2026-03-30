# CLAUDE.md - better-godot-mcp

MCP Server cho Godot Engine. TypeScript, Node.js >= 24, bun, ESM.
17 composite mega-tools cho game development. Zod v4 schema validation.

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
bun run dev                      # tsx watch dev server

# Mise shortcuts
mise run setup     # full dev setup
mise run lint      # bun run check
mise run test      # vitest
mise run fix       # bun run check:fix
```

## Cau truc thu muc

```
src/
  init-server.ts                 # Entry point
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
- Infisical project: `430ac905-a60f-4597-b5cd-1727daa95389`
