# AGENTS.md - better-godot-mcp

Composite MCP Server for Godot Engine. TypeScript, Node.js >= 24, pnpm, ESM.

## Build / Lint / Test Commands

```bash
pnpm install                # Install dependencies
pnpm build                  # tsc --build && esbuild CLI bundle
pnpm check                  # Biome check + tsc --noEmit (CI command)
pnpm check:fix              # Auto-fix Biome issues
pnpm test                   # vitest run (all tests)
pnpm test:watch             # vitest in watch mode
pnpm dev                    # tsx watch dev server

# Run a single test file
pnpm exec vitest run tests/helpers/errors.test.ts

# Run a single test by name
pnpm exec vitest run -t "test name pattern"

# Mise shortcuts
mise run setup              # Full dev environment setup
mise run lint               # pnpm check
mise run test               # pnpm test
mise run fix                # pnpm check:fix
```

## Code Style

### Formatting (Biome)

- **Indent**: 2 spaces
- **Line width**: 120
- **Quotes**: Single quotes
- **Semicolons**: As needed (omit when possible)
- **Trailing commas**: All (JS/TS), None (JSON)
- **Arrow parens**: Always `(x) => ...`
- **Line endings**: LF

### Imports

1. Node.js builtins with `node:` prefix (`import { join } from 'node:path'`)
2. External packages (`@modelcontextprotocol/sdk`, `zod`)
3. Internal modules (relative paths `./`, `../`)
4. Use `import type` for type-only imports (enforced by `verbatimModuleSyntax`)
5. **Always use `.js` extension** in import paths (ESM/NodeNext requirement)

```typescript
import { execSync } from 'node:child_process'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import type { GodotConfig } from './godot/types.js'
import { registerTools } from './tools/registry.js'
```

### TypeScript

- `strict: true`, `verbatimModuleSyntax: true`, `isolatedModules: true`
- Target: ES2024, Module: NodeNext
- Schema validation: Zod v4

### Naming Conventions

| Element              | Convention       | Example                          |
|----------------------|------------------|----------------------------------|
| Functions/variables  | camelCase        | `detectGodot()`, `envPath`       |
| Module constants     | UPPER_SNAKE_CASE | `SERVER_NAME`, `DEFAULT_TIMEOUT_MS` |
| Interfaces/Types     | PascalCase       | `GodotConfig`, `DetectionResult` |
| Classes              | PascalCase       | `GodotMCPError`                  |
| Files/directories    | kebab-case       | `scene-parser.ts`, `composite/`  |
| Tool names/params    | snake_case       | `input_map`, `project_path`      |

### Error Handling

- Custom `GodotMCPError` class with `code`, `suggestion`, `details` fields
- `formatError()` converts errors to MCP `{ content, isError }` response format
- `formatSuccess()` and `formatJSON()` for consistent success responses
- `withErrorHandling()` HOF wrapper for all tool handlers
- Bare `catch {}` blocks only for expected failures (e.g., binary not found)

### Biome Lint Rules

- `noUnusedImports`: error
- `useConst`: error
- `useTemplate`: error
- `noExplicitAny`: warn (not error)
- `noUnusedVariables`: warn
- `noNonNullAssertion`: warn

### File Organization

```
src/
  init-server.ts              # Entry point
  godot/                      # Godot binary detection, headless execution, types
  tools/
    registry.ts               # Tool definitions (P0-P3 priority) + routing
    composite/                 # One file per mega-tool (18 tools)
    helpers/                   # errors.ts, scene-parser.ts, godot-types.ts, project-settings.ts
tests/
  fixtures.ts                 # Shared test fixtures
  helpers/                    # Unit tests for helper modules
  composite/                  # Integration tests for composite tools
```

### Documentation

- `/** */` JSDoc on every exported function
- File-level doc comment at top of every file describing the module
- No `@param`/`@returns` tags -- rely on TypeScript types

### Commits

Conventional Commits: `type(scope): message` (e.g., `feat:`, `fix:`, `docs:`, `chore:`)

### Pre-commit Hooks

1. Biome check (`--diagnostic-level=error`)
2. TypeScript check (`tsc --noEmit`)
3. Tests on pre-push (`pnpm test`)
