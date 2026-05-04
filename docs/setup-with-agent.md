# Better Godot MCP -- Agent Setup Guide

> Give this file to your AI agent to automatically set up better-godot-mcp.

> **2026-05-02 Update (v\<auto\>+)**: Plugin install (Option 1) uses stdio mode (no auth required for godot).
> The previous default of HTTP transport has been changed to stdio.
> If you relied on HTTP mode, set `MCP_TRANSPORT=http` or pass `--http` flag.

## Method overview

This plugin supports **1 install method only**: stdio via plugin install (`uvx`/`npx`). Reason: the plugin needs direct host access to your project files (Godot project / repo path) and doesn't ship Docker or HTTP variants.

For comparison, the other 6 plugins in this stack (`better-notion-mcp`, `better-email-mcp`, `better-telegram-mcp`, `wet-mcp`, `mnemo-mcp`, `imagine-mcp`) support 3 methods:
1. **Default** -- Plugin install (`uvx`/`npx`) stdio
2. **Fallback** -- Docker stdio (Windows/macOS PATH issues)
3. **Recommended** -- Docker HTTP (multi-device, OAuth/relay form, claude.ai web)

## Option 1: Claude Code Plugin (Recommended)

```bash
/plugin marketplace add n24q02m/claude-plugins
/plugin install better-godot-mcp@n24q02m-plugins
```

This installs the server in stdio mode with skills: `/build-scene`, `/debug-issue`, `/add-mechanic`. No environment variables required -- it just works.

Optionally set `GODOT_PROJECT_PATH` to point at your Godot project; otherwise pass `project_path` per tool call.

## Option 2: MCP Direct (stdio)

Stdio mode runs as a child process of your MCP client. No auth, no relay, no daemon.

### Claude Code (settings.json)

Add to `.claude/settings.json` or `~/.claude/settings.json`:

```json
{
  "mcpServers": {
    "better-godot-mcp": {
      "command": "npx",
      "args": ["-y", "@n24q02m/better-godot-mcp"],
      "env": {
        "GODOT_PROJECT_PATH": "/path/to/your/godot/project"
      }
    }
  }
}
```

### Codex CLI (config.toml)

Add to `~/.codex/config.toml`:

```toml
[mcp_servers.better-godot-mcp]
command = "npx"
args = ["-y", "@n24q02m/better-godot-mcp"]

[mcp_servers.better-godot-mcp.env]
GODOT_PROJECT_PATH = "/path/to/your/godot/project"
```

### OpenCode (opencode.json)

Add to `opencode.json` in your project root:

```json
{
  "mcpServers": {
    "better-godot-mcp": {
      "command": "npx",
      "args": ["-y", "@n24q02m/better-godot-mcp"],
      "env": {
        "GODOT_PROJECT_PATH": "/path/to/your/godot/project"
      }
    }
  }
}
```

## Option 3: Docker (stdio)

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

Mount your Godot project directory into the container.

## Why upgrade to HTTP mode?

Stdio (Options 1-3) is the simplest path: zero config, no auth, runs as a child process per MCP client session. For most users, that is enough.

Switch to HTTP mode (Option 4 below) when you need any of:

- **claude.ai web compatibility** -- the web UI cannot spawn a local stdio process; it requires a remote HTTP endpoint.
- **1 server shared across N Claude Code sessions** -- one HTTP daemon serves multiple concurrent CC sessions.
- **Multi-device sync** -- expose a self-hosted endpoint reachable from laptop, desktop, and phone.
- **Multi-user / team sharing** -- a single HTTP deployment with per-user JWT subjects can serve a small team.
- **Always-on persistent process** -- for webhooks, scheduled agents, or long-lived background tasks.

## Option 4: Self-Host HTTP Mode (Optional)

Better Godot MCP exposes a raw MCP-over-HTTP endpoint. There is no auth layer (godot has no credentials to protect), so anyone who can reach the URL can use the tools -- bind it only to trusted networks (loopback, Tailscale, VPN, or behind a reverse proxy with your own auth).

Start the server in HTTP mode:

```bash
# Either via flag:
npx -y @n24q02m/better-godot-mcp --http

# Or via env var:
MCP_TRANSPORT=http npx -y @n24q02m/better-godot-mcp
```

Then point the MCP client at the URL:

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

## Environment Variables

| Variable | Required | Default | Description |
|:---------|:---------|:--------|:------------|
| `GODOT_PROJECT_PATH` | No | -- | Default project path. Tools also accept `project_path` parameter per call. |
| `GODOT_PATH` | No | Auto-detected | Path to Godot binary. Auto-detected from PATH and common install locations. |
| `MCP_TRANSPORT` | No | `stdio` | Set to `http` to run in HTTP mode (Option 4). The `--http` CLI flag is equivalent. |
| `PORT` | No | `0` (auto) | HTTP port when `MCP_TRANSPORT=http`. Set explicitly when you need a stable port. |

## Authentication

No authentication required. This server operates on local files only.

## Verification

After setup, verify the server is working by calling the `config` tool:

```
Use the config tool with action "check" to verify the server is connected and can find Godot.
```

Expected: the tool returns Godot binary path and project status.
