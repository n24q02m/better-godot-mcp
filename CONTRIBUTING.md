# Contributing to better-godot-mcp

Thank you for your interest in contributing to better-godot-mcp! This guide will help you get started.

## Getting Started

### Prerequisites

- **mise** (recommended) or **Node.js 24+** and **Bun**
- Git
- A GitHub account

**Recommended:** Use [mise](https://mise.jdx.dev/) to automatically manage Node.js and Bun versions from `.mise.toml`.

### Setup Development Environment

1. **Fork the repository** and clone your fork

```bash
git clone https://github.com/YOUR_USERNAME/better-godot-mcp
cd better-godot-mcp
```

2. **Install tools and dependencies**

If using **mise** (recommended):

```bash
mise run setup
```

Without mise, ensure you have Node.js 24+ and Bun installed:

```bash
bun install
bun run pre-commit install
```

3. **Run checks**

```bash
bun run check       # Biome lint + type check
bun test            # Run tests
```

## Development Workflow

### Running Locally

```bash
# Run the server in dev mode (with watch)
bun run dev
```

### Making Changes

1. Create a new branch: `git checkout -b feature/your-feature-name`
2. Make your changes
3. Run checks: `bun run check`
4. Run tests: `bun test`
5. Commit your changes (see [Commit Convention](#commit-convention))
6. Push to your fork: `git push origin feature/your-feature-name`
7. Open a Pull Request

## Commit Convention

We use [Conventional Commits](https://www.conventionalcommits.org/):

```text
<type>[optional scope]: <description>
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes
- `refactor`: Code refactoring
- `perf`: Performance improvements
- `test`: Adding or updating tests
- `chore`: Maintenance tasks
- `ci`: CI/CD changes
- `build`: Build system changes

### Examples

```text
feat: add new tool action for shader compilation
fix: correct scene parser regex for nested resources
docs: update README examples
```

## Release Process

Releases are automated using **python-semantic-release (PSR) v10**. We strictly follow the **Conventional Commits** specification to determine version bumps and generate changelogs automatically.

### How to Release

1. Create a Pull Request with your changes.
2. Ensure your commit messages follow the convention above.
3. Merge the PR to `main`.
4. A maintainer triggers the CD workflow manually via **workflow_dispatch**:
   - Choose `beta` or `stable` release type.
   - PSR analyzes commits since the last release.
   - Bumps version, updates `CHANGELOG.md`, creates a tag.
   - Publishes to npm.
   - Creates a GitHub Release.
   - Builds and pushes Docker images.

You do **not** need to create manual tags or changelog entries.

## Pull Request Guidelines

- Keep PRs focused on a single feature or fix
- Update documentation if needed
- Add tests for new functionality
- Ensure all checks pass

### PR Checklist

Before submitting your PR, ensure:

- [ ] Code follows TypeScript best practices
- [ ] All tests pass (`bun test`)
- [ ] Linting passes (`bun run check`)
- [ ] Commit messages follow **Conventional Commits**
- [ ] Documentation updated (if needed)

## Code Style

This project uses **Biome** for formatting and linting.

```bash
bun run check       # Check for issues (lint + type check)
bun run check:fix   # Auto-fix issues
```

### Style Rules

- **Indent**: 2 spaces
- **Quotes**: Single quotes
- **Semicolons**: As needed
- **Line width**: 120 characters
- **TypeScript**: Strict mode enabled

## Testing

```bash
bun test              # Run all tests
bun run test:watch    # Watch mode
```

- Write tests for all new functionality
- Place unit tests in `tests/helpers/`
- Place integration tests in `tests/composite/`
- Use factory functions from `tests/fixtures.ts`
- Use [Vitest](https://vitest.dev/) as the test framework

## Project Structure

```text
better-godot-mcp/
├── src/
│   ├── init-server.ts        # MCP server initialization
│   ├── godot/                # Godot detection, types, version checks
│   └── tools/
│       ├── registry.ts       # Tool registration and routing
│       ├── composite/        # Composite tool handlers (scenes, nodes, shader, etc.)
│       └── helpers/          # Shared helpers (scene-parser, godot-types, etc.)
├── tests/
│   ├── helpers/              # Unit tests for helpers
│   ├── composite/            # Integration tests for composite tools
│   └── fixtures.ts           # Shared test fixtures and factory functions
├── biome.json
├── tsconfig.json
├── package.json
├── README.md
├── CONTRIBUTING.md           # This guide
├── LICENSE                   # MIT License
├── Dockerfile                # Docker build configuration
├── AGENTS.md                 # Agent-specific instructions
└── CLAUDE.md                 # Development notes and known bugs
```

## Questions?

Before opening a new issue, please check the **Known bugs** section in `CLAUDE.md`.

Feel free to open an issue for:

- Bug reports
- Feature requests
- Questions about the codebase
- Discussion about architecture

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

---

**Thank you for contributing!**
