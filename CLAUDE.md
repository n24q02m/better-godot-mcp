# CLAUDE.md - better-godot-mcp

MCP Server cho Godot Engine. TypeScript, Node.js >= 24, bun, ESM.
17 composite mega-tools cho game development. Zod v4 schema validation.
Dual-mode: stdio (default) + HTTP (via `--http` flag, `MCP_TRANSPORT=http`, or `TRANSPORT_MODE=http`).

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
bun run dev                      # tsx watch dev server (stdio mode, default)
bun run dev:http                 # tsx watch dev server (HTTP mode, MCP_TRANSPORT=http)
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
  init-server.ts                 # Entry point, transport mode detection (HTTP via @n24q02m/mcp-core runHttpServer, no auth)
  transports/
    stdio.ts                     # Stdio transport (default mode)
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
- `MCP_TRANSPORT` -- `http` de dung HTTP mode (default: stdio); cung chap nhan `--http` flag hoac `TRANSPORT_MODE=http`
- `PORT` -- HTTP port (default: 0 = auto-assign)
- `HOST` -- HTTP host (HTTP mode)

## Code conventions

- Biome: 2 spaces, 120 line width, single quotes, semicolons as needed
- Import: `node:` prefix cho builtins, `.js` extension bat buoc (ESM/NodeNext)
- `import type` bat buoc cho type-only imports (`verbatimModuleSyntax`)
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

## Auth & storage model

Godot la **TC-Local**: khong luu credential nao. HTTP mode goi `runHttpServer` cua `@n24q02m/mcp-core` **khong** truyen `relaySchema`, nen server chi serve `/mcp` (khong auth) + `/health` -- khong co OAuth AS, khong co credential form / relay form, khong co JWT, khong co MCP_RELAY_PASSWORD gate. Vi vay:

- Khong co credential flow nao de "stuck" -- cac setup_* action cua tool `config` la no-op (xem `src/tools/composite/config.ts`).
- Server khong ghi config storage. (Trong mcp-core, credential storage canonical la `PerPluginStore` o `~/.<plugin>-mcp/config.json`; `config.enc` la legacy/deprecated. Godot khong dung ca hai.)
- Khac voi wet/mnemo/imagine (co credential + multi-user), godot khong deploy public va khong co `better-godot-mcp.n24q02m.com`.

## E2E

Driven by `mcp-core/scripts/e2e/` (matrix-locked, 15 configs). Run a single config from this repo via `make e2e` (proxy) or directly:

```
cd ../mcp-core && uv run --project scripts/e2e python -m e2e.driver <config-id>
```

Configs for this repo: `godot-stub`, `godot-with-exe`.

T0 ``godot-stub`` runs in CI (no exe); ``godot-with-exe`` is t2-non-interaction local-only and requires Godot binary on PATH.

Tier policy:

- **T0** (precommit + CI on PR / main push) - runs without upstream identity. Skret keys not required.
- **T2 non-interaction** (`make e2e-config CONFIG=<id>` locally) - runs `godot-with-exe` against a real Godot binary on PATH. No relay form and no user gate: godot is TC-Local (no credentials), so there is nothing to pre-fill and no upstream sign-in.

Godot has no credential form and no upstream OAuth, so there is no T2 interaction tier (no user-gate URL, no OTP / device-code / oauth-redirect flow) for this server.

Godot stores no credentials and is not deployed as a public HTTP service, so multi-user remote mode (`CREDENTIAL_SECRET`, per-JWT-sub isolation) does not apply.

References: `mcp-core/scripts/e2e/matrix.yaml`, `~/.claude/skills/mcp-dev/references/e2e-full-matrix.md` (harness-readiness gate).

