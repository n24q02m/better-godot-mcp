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

1. Open Claude Code in your terminal
2. Run:
   ```bash
   /plugin marketplace add n24q02m/claude-plugins
   /plugin install better-godot-mcp@n24q02m-plugins
   ```
3. The plugin auto-configures the MCP server in stdio mode. No environment variables required -- it just works.

Optionally set `GODOT_PROJECT_PATH` to point at your Godot project directory; otherwise pass `project_path` per tool call.

## Method 2: npx (Any MCP Client)

Stdio mode runs as a child process of your MCP client. No auth, no relay, no daemon.

1. Add the following to your MCP client configuration file:

   **Claude Code** -- `.claude/settings.json` or `~/.claude/settings.json`:
   ```json
   {
     "mcpServers": {
       "better-godot-mcp": {
         "command": "npx",
         "args": ["-y", "@n24q02m/better-godot-mcp"]
       }
     }
   }
   ```

   **Codex CLI** -- `~/.codex/config.toml`:
   ```toml
   [mcp_servers.better-godot-mcp]
   command = "npx"
   args = ["-y", "@n24q02m/better-godot-mcp"]
   ```

   **OpenCode** -- `opencode.json`:
   ```json
   {
     "mcpServers": {
       "better-godot-mcp": {
         "command": "npx",
         "args": ["-y", "@n24q02m/better-godot-mcp"]
       }
     }
   }
   ```

2. Restart your MCP client to pick up the new server.

Other package runners (`bun x`, `pnpm dlx`, `yarn dlx`) also work in place of `npx -y`.

## Method 3: Docker (stdio)

1. Pull the image:
   ```bash
   docker pull n24q02m/better-godot-mcp:latest
   ```

2. Add to your MCP client config:
   ```json
   {
     "mcpServers": {
       "better-godot-mcp": {
         "command": "docker",
         "args": [
           "run", "-i", "--rm",
           "-v", "/path/to/your/godot/project:/project",
           "-e", "GODOT_PROJECT_PATH=/project",
           "n24q02m/better-godot-mcp:latest"
         ]
       }
     }
   }
   ```

3. Replace `/path/to/your/godot/project` with the absolute path to your Godot project directory.

**Note:** Docker mode has limited filesystem access. You must mount your project directory.

## Method 4: Build from Source

1. Clone and build:
   ```bash
   git clone https://github.com/n24q02m/better-godot-mcp.git
   cd better-godot-mcp
   bun install
   bun run build
   ```

2. Run the dev server:
   ```bash
   bun run dev:stdio
   ```

3. Or point your MCP client to the built binary:
   ```json
   {
     "mcpServers": {
       "better-godot-mcp": {
         "command": "node",
         "args": ["/path/to/better-godot-mcp/bin/cli.mjs"]
       }
     }
   }
   ```

## Why upgrade to HTTP mode?

Stdio mode (Methods 1-4 above) is the simplest path: zero config, no auth, runs as a child process per MCP client session. For most users, that is enough.

Switch to HTTP mode (Method 5 below) when you need any of the following:

- **claude.ai web compatibility** -- the web UI cannot spawn a local stdio process; it requires a remote HTTP endpoint.
- **1 server shared across N Claude Code sessions** -- one HTTP daemon serves multiple concurrent CC sessions instead of spawning a process per session.
- **Multi-device sync** -- expose a self-hosted endpoint reachable from your laptop, desktop, and phone.
- **Multi-user / team sharing** -- a single HTTP deployment with per-user JWT subjects can serve a small team.
- **Always-on persistent process** -- needed for webhooks, scheduled agents, or long-lived background tasks that outlive a CC session.

If none of those apply, stay on stdio.

## Method 5: Self-Host HTTP Mode (Optional)

Better Godot MCP exposes a raw MCP-over-HTTP endpoint. There is no auth layer (godot has no credentials to protect), so anyone who can reach the URL can use the tools -- bind it only to trusted networks (loopback, Tailscale, VPN, or behind a reverse proxy with your own auth).

1. Run the binary in HTTP mode:
   ```bash
   # Either via flag:
   npx -y @n24q02m/better-godot-mcp --http

   # Or via env var:
   MCP_TRANSPORT=http npx -y @n24q02m/better-godot-mcp
   ```

2. Or via Docker:
   ```bash
   docker run --rm -p 3000:3000 \
     -e MCP_TRANSPORT=http \
     -e PORT=3000 \
     -v /path/to/your/godot/project:/project \
     -e GODOT_PROJECT_PATH=/project \
     n24q02m/better-godot-mcp:latest
   ```

3. Point your MCP client at the URL:
   ```json
   {
     "mcpServers": {
       "better-godot-mcp": {
         "url": "http://127.0.0.1:3000/mcp"
       }
     }
   }
   ```

For exposure beyond loopback, front the port with Cloudflare Tunnel + Caddy + a custom auth layer (or Tailscale for private mesh access). Do not expose the raw port to the public internet.

## Environment Variable Reference

| Variable | Required | Default | Description |
|:---------|:---------|:--------|:------------|
| `GODOT_PROJECT_PATH` | No | -- | Default Godot project directory. Each tool call can also pass `project_path` as a parameter. |
| `GODOT_PATH` | No | Auto-detected | Explicit path to the Godot binary. If not set, the server searches PATH and common install locations (Windows, macOS, Linux). |
| `MCP_TRANSPORT` | No | `stdio` | Set to `http` to run in HTTP mode (Method 5). The `--http` CLI flag is equivalent. |
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
