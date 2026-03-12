# Better Godot MCP

**Composite MCP Server for Godot Engine - Optimized for AI Agents**

[![CI](https://github.com/n24q02m/better-godot-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/n24q02m/better-godot-mcp/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/n24q02m/better-godot-mcp/graph/badge.svg?token=PF94LT0K2L)](https://codecov.io/gh/n24q02m/better-godot-mcp)
[![npm](https://img.shields.io/npm/v/@n24q02m/better-godot-mcp?logo=npm&logoColor=white)](https://www.npmjs.com/package/@n24q02m/better-godot-mcp)
[![Docker](https://img.shields.io/docker/v/n24q02m/better-godot-mcp?label=docker&logo=docker&logoColor=white&sort=semver)](https://hub.docker.com/r/n24q02m/better-godot-mcp)
[![License: MIT](https://img.shields.io/github/license/n24q02m/better-godot-mcp)](LICENSE)

[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](#)
[![Node.js](https://img.shields.io/badge/Node.js-5FA04E?logo=nodedotjs&logoColor=white)](#)
[![Godot Engine](https://img.shields.io/badge/Godot_Engine-478CBF?logo=godotengine&logoColor=white)](#)
[![semantic-release](https://img.shields.io/badge/semantic--release-e10079?logo=semantic-release&logoColor=white)](https://github.com/python-semantic-release/python-semantic-release)
[![Renovate](https://img.shields.io/badge/renovate-enabled-1A1F6C?logo=renovatebot&logoColor=white)](https://developer.mend.io/)

## Why "Better"?

**18 composite tools** that consolidate Godot Engine operations into action-based mega-tools optimized for AI agents.

<a href="https://glama.ai/mcp/servers/n24q02m/better-godot-mcp">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/n24q02m/better-godot-mcp/badge" alt="better-godot-mcp MCP server" />
</a>

### Key Features

| Feature | Description |
|---------|-------------|
| **Composite Actions** | 1 tool call instead of multiple steps |
| **Full Scene Control** | Create, parse, modify `.tscn` files directly |
| **GDScript CRUD** | Create, read, write, attach scripts |
| **Shader Support** | Create, edit shaders with Godot 4 syntax |
| **Input Mapping** | Manage input actions and events |
| **Physics/Audio/Nav** | Configure collision layers, audio buses, navigation |
| **Token Efficient** | Tiered descriptions with on-demand `help` tool |

---

## Quick Start

### Option 1: Package Manager (Recommended)

```jsonc
{
  "mcpServers": {
    "better-godot": {
      "command": "bun",
      "args": ["x", "@n24q02m/better-godot-mcp@latest"]
    }
  }
}
```

Alternatively, you can use `npx`, `pnpm dlx`, or `yarn dlx`:

| Runner | `command` | `args` |
|--------|-----------|--------|
| npx | `npx` | `["-y", "@n24q02m/better-godot-mcp@latest"]` |
| pnpm | `pnpm` | `["dlx", "@n24q02m/better-godot-mcp@latest"]` |
| yarn | `yarn` | `["dlx", "@n24q02m/better-godot-mcp@latest"]` |

### Option 2: Docker

```jsonc
{
  "mcpServers": {
    "better-godot": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "--name", "mcp-godot",
        "n24q02m/better-godot-mcp:latest"
      ]
    }
  }
}
```

> **Note:** Project path is passed via tool parameters (`project_path`), not environment variables.

---

## Tools

| Tool | Actions |
|------|---------|
| `project` | info, version, run, stop, settings_get, settings_set, export |
| `scenes` | create, list, info, delete, duplicate, set_main |
| `nodes` | add, remove, rename, list, set_property, get_property |
| `scripts` | create, read, write, attach, list, delete |
| `editor` | launch, status |
| `setup` | detect_godot, check |
| `config` | status, set |
| `help` | Get full documentation for any tool |
| `resources` | list, info, delete, import_config |
| `input_map` | list, add_action, remove_action, add_event |
| `signals` | list, connect, disconnect |
| `animation` | create_player, add_animation, add_track, add_keyframe, list |
| `tilemap` | create_tileset, add_source, set_tile, paint, list |
| `shader` | create, read, write, get_params, list |
| `physics` | layers, collision_setup, body_config, set_layer_name |
| `audio` | list_buses, add_bus, add_effect, create_stream |
| `navigation` | create_region, add_agent, add_obstacle |
| `ui` | create_control, set_theme, layout, list_controls |

---

## Token Optimization

**Tiered descriptions** for efficient token usage:

| Tier | Purpose | When |
|------|---------|------|
| **Tier 1** | Compressed descriptions | Always loaded |
| **Tier 2** | Full docs via `help` tool | On-demand |

```json
{"name": "help", "tool_name": "scenes"}
```

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GODOT_PROJECT_PATH` | No | Default project path (most tools accept `project_path` param) |
| `GODOT_PATH` | No | Path to Godot binary (auto-detected if not set) |

---

## Limitations

- Requires Godot 4.x project structure
- Scene files (`.tscn`) are parsed/modified via text manipulation, not Godot's internal API
- `run`/`stop`/`export` actions require Godot binary to be installed
- Docker mode has limited filesystem access (mount your project directory)

---

## Build from Source

```bash
git clone https://github.com/n24q02m/better-godot-mcp
cd better-godot-mcp
mise run setup
bun run build
```

**Requirements:** Node.js 24+, [bun](https://bun.sh/) latest

## Compatible With

[![Claude Desktop](https://img.shields.io/badge/Claude_Desktop-F9DC7C?logo=anthropic&logoColor=black)](#quick-start)
[![Claude Code](https://img.shields.io/badge/Claude_Code-000000?logo=anthropic&logoColor=white)](#quick-start)
[![Cursor](https://img.shields.io/badge/Cursor-000000?logo=cursor&logoColor=white)](#quick-start)
[![VS Code Copilot](https://img.shields.io/badge/VS_Code_Copilot-007ACC?logo=visualstudiocode&logoColor=white)](#quick-start)
[![Antigravity](https://img.shields.io/badge/Antigravity-4285F4?logo=google&logoColor=white)](#quick-start)
[![Gemini CLI](https://img.shields.io/badge/Gemini_CLI-8E75B2?logo=googlegemini&logoColor=white)](#quick-start)
[![OpenAI Codex](https://img.shields.io/badge/Codex-412991?logo=openai&logoColor=white)](#quick-start)
[![OpenCode](https://img.shields.io/badge/OpenCode-F7DF1E?logoColor=black)](#quick-start)

## Also by n24q02m

| Server | Description | Install |
|--------|-------------|---------|
| [better-notion-mcp](https://github.com/n24q02m/better-notion-mcp) | Notion API for AI agents | `npx -y @n24q02m/better-notion-mcp@latest` |
| [wet-mcp](https://github.com/n24q02m/wet-mcp) | Web search, content extraction, library docs | `uvx --python 3.13 wet-mcp@latest` |
| [mnemo-mcp](https://github.com/n24q02m/mnemo-mcp) | Persistent AI memory with hybrid search | `uvx mnemo-mcp@latest` |
| [better-email-mcp](https://github.com/n24q02m/better-email-mcp) | Email (IMAP/SMTP) for AI agents | `npx -y @n24q02m/better-email-mcp@latest` |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)

## License

MIT - See [LICENSE](LICENSE)
