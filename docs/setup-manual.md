# Better Godot MCP -- Manual Setup Guide

> **2026-05-02 Update (v\<auto\>+)**: Plugin install (Method 1) uses stdio mode (no auth required for godot).
> The previous default of HTTP transport has been changed to stdio.
> If you relied on HTTP mode, set `MCP_TRANSPORT=http` or pass `--http` flag.

## Method overview

This plugin supports **1 install method only**: stdio via plugin install (`uvx`/`npx`). Reason: the plugin needs direct host access to your project files (Godot project / repo path) and doesn't ship Docker or HTTP variants.

For comparison, the other 6 plugins in this stack (`better-notion-mcp`, `better-email-mcp`, `better-telegram-mcp`, `wet-mcp`, `mnemo-mcp`, `imagine-mcp`) support 3 methods:
1. **Default** -- Plugin install (`uvx`/`npx`) stdio
2. **Fallback** -- Docker stdio (Windows/macOS PATH issues)
3. **Recommended** -- Docker HTTP (multi-device, OAuth/relay form, claude.ai web)

## Prerequisites

- **Node.js** >= 24.14.1
- **Godot Engine** 4.x installed (required for `run`, `stop`, `export` actions; optional for scene/script editing)
- A Godot 4.x project with a `project.godot` file

## Method 1: Claude Code Plugin (Recommended)

### Step 0: Credential prompt

`better-godot-mcp` declares **no `userConfig` fields** in `plugin.json` -- Claude Code does not prompt for any credentials when you install the plugin. The server operates on local Godot project files only and needs no API keys, tokens, or shared secrets.

`project_path` (the location of your Godot project) is passed per tool call, or via the optional `GODOT_PROJECT_PATH` env var which you can set in `mcpServers.better-godot-mcp.env` manually -- it is intentionally **not** a sensitive `userConfig` field because the value is not a credential.

### Steps

1. Open Claude Code in your terminal.
2. Run:
   ```bash
   /plugin marketplace add n24q02m/claude-plugins
   /plugin install better-godot-mcp@n24q02m-plugins
   ```
3. The plugin auto-configures the MCP server in stdio mode -- no prompts, no env vars required, it just works.

Optionally set `GODOT_PROJECT_PATH` to point at your Godot project directory; otherwise pass `project_path` per tool call.

## Environment Variable Reference

| Variable | Required | Default | Description |
|:---------|:---------|:--------|:------------|
| `GODOT_PROJECT_PATH` | No | -- | Default Godot project directory. Each tool call can also pass `project_path` as a parameter. |
| `GODOT_PATH` | No | Auto-detected | Explicit path to the Godot binary. If not set, the server searches PATH and common install locations (Windows, macOS, Linux). |
| `MCP_TRANSPORT` | No | `stdio` | Set to `http` to run in HTTP mode (advanced; not in scope of this guide). The `--http` CLI flag is equivalent. |
| `PORT` | No | `0` (auto) | HTTP port when `MCP_TRANSPORT=http`. Set explicitly when you need a stable port. |

## Troubleshooting

### Server starts but tools fail with "project not found"

- Ensure your Godot project has a `project.godot` file at its root.
- Set `GODOT_PROJECT_PATH` to the directory containing `project.godot`, or pass `project_path` in each tool call.

### Godot binary not detected

- Install Godot 4.x and ensure it is on your PATH, or set `GODOT_PATH` to the full path of the Godot executable.
- Use the `config` tool with action `detect_godot` to see where the server is looking.

### Docker: "permission denied" or empty file listings

- Ensure the volume mount path is correct: `-v /absolute/path:/project`.
- On Linux, you may need to add `:z` to the mount flag for SELinux: `-v /path:/project:z`.

### npx: "command not found" or old version

- Verify Node.js >= 24.14.1: `node --version`.
- Clear the npx cache: `npx --yes clear-npx-cache` or use `@latest` tag: `npx -y @n24q02m/better-godot-mcp@latest`.

### Tools return errors about Godot 3.x

- This server requires Godot 4.x project structure. Godot 3.x projects are not supported.
