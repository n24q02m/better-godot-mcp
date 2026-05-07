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

## E2E

Driven by `mcp-core/scripts/e2e/` (matrix-locked, 15 configs). Run a single config from this repo via `make e2e` (proxy) or directly:

```
cd ../mcp-core && uv run --project scripts/e2e python -m e2e.driver <config-id>
```

Configs for this repo: `godot-stub`, `godot-with-exe`.

T0 ``godot-stub`` runs in CI (no exe); ``godot-with-exe`` is t2-non-interaction local-only and requires Godot binary on PATH.

Tier policy:

- **T0** (precommit + CI on PR / main push) - runs without upstream identity. Skret keys not required.
- **T2 non-interaction** (`make e2e-config CONFIG=<id>` locally) - driver pre-fills relay form from skret AWS SSM `n/a (no skret credentials)` (`ap-southeast-1`). No user gate.
- **T2 interaction** - driver fills relay form, then prints upstream user-gate URL; user signs in / types OTP at provider. Driver enforces per-flow timeouts (device-code 900s, oauth-redirect 300s, browser-form 600s) and emits `[poll] elapsed=Xs remaining=Ys status=<body>` every 30s. On timeout, container logs + last `setup-status` are saved to `<tmp>/e2e-diag/` BEFORE teardown for post-mortem.

Multi-user remote mode (deployment property; not a separate config) requires `MCP_DCR_SERVER_SECRET` in the same skret namespace - driver refuses to start the container without it when `PUBLIC_URL` is set.

References: `mcp-core/scripts/e2e/matrix.yaml`, `~/.claude/skills/mcp-dev/references/e2e-full-matrix.md` (harness-readiness gate), `~/.claude/skills/mcp-dev/references/secrets-skret.md` (per-server credential layout), `~/.claude/skills/mcp-dev/references/multi-user-pattern.md` (per-JWT-sub isolation).

