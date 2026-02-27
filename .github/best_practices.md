# Style Guide - better-godot-mcp

## Architecture
MCP server for Godot Engine. TypeScript, single-package repo.

## TypeScript
- Formatter/Linter: Biome (2 spaces, double quotes, semicolons)
- Build: esbuild (bundle to single file)
- Test: Vitest
- Runtime: Node.js (ES modules)
- SDK: @modelcontextprotocol/sdk

## Code Patterns
- Composite mega-tools for game development workflows
- File system operations must validate paths (prevent path traversal)
- Scene/resource parsing with proper .tscn/.tres format handling
- GDScript template generation for common patterns
- Async I/O preferred for all file operations
- Zod for input validation on all tool parameters

## Commits
Conventional Commits (feat:, fix:, chore:, docs:, refactor:, test:).

## Security
Validate all file paths against project root. Never execute arbitrary shell commands. Sanitize user inputs.
