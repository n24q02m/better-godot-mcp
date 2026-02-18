# Contributing to Better Godot MCP

Thank you for your interest in contributing! This guide will help you get started.

## Prerequisites

- [Node.js](https://nodejs.org/) 24+
- [pnpm](https://pnpm.io/) 10+
- [mise](https://mise.jdx.dev/) (recommended)

## Setup

```bash
git clone https://github.com/n24q02m/better-godot-mcp.git
cd better-godot-mcp
mise run setup    # or: pnpm install
```

## Development Workflow

1. Create a branch from `main`:
   ```bash
   git checkout -b feat/my-feature
   ```

2. Make your changes and test:
   ```bash
   pnpm test          # Run tests
   pnpm check         # Lint + type check
   pnpm dev           # Dev server with watch
   ```

3. Commit using [Conventional Commits](https://www.conventionalcommits.org/):
   ```
   feat: add new tool action
   fix: correct scene parser regex
   docs: update README examples
   ```

4. Push and open a Pull Request against `main`

## Project Structure

```
src/
  godot/          # Godot detection, types, version checks
  tools/
    composite/    # Composite tool handlers (scenes, nodes, shader, etc.)
    helpers/      # Shared helpers (scene-parser, godot-types, etc.)
    registry.ts   # Tool registration and routing
  init-server.ts  # MCP server initialization
tests/
  helpers/        # Unit tests for helpers
  composite/      # Integration tests for composite tools
  fixtures.ts     # Shared test fixtures and factory functions
```

## Code Style

- **Formatter**: [Biome](https://biomejs.dev/) (2-space indent, single quotes, no semicolons)
- **Linting**: Biome rules + TypeScript strict mode
- **Line width**: 120 characters
- **Test framework**: [Vitest](https://vitest.dev/)

## Testing

- Write tests for all new functionality
- Place unit tests in `tests/helpers/`
- Place integration tests in `tests/composite/`
- Use factory functions from `tests/fixtures.ts`

```bash
pnpm test             # Run all tests
pnpm test:watch       # Watch mode
```

## Pull Request Guidelines

- Fill out the PR template completely
- Ensure all CI checks pass
- Keep PRs focused on a single concern
- Update documentation if behavior changes
- Add tests for new functionality

## Release Process

Releases are automated via [python-semantic-release](https://python-semantic-release.readthedocs.io/)
and triggered through the CD workflow. Version bumps are determined by commit messages.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
