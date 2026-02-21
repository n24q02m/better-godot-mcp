# Better Godot MCP

**Composite MCP Server for Godot Engine - Optimized for AI Agents**

[![CI](https://github.com/n24q02m/better-godot-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/n24q02m/better-godot-mcp/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/@n24q02m/better-godot-mcp)](https://www.npmjs.com/package/@n24q02m/better-godot-mcp)
[![Docker](https://img.shields.io/docker/v/n24q02m/better-godot-mcp?label=docker)](https://hub.docker.com/r/n24q02m/better-godot-mcp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

## Why "Better"?

**18 composite tools** that consolidate Godot Engine operations into action-based mega-tools optimized for AI agents.

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

### Option 1: npx (Recommended)

```jsonc
{
  "mcpServers": {
    "better-godot": {
      "command": "npx",
      "args": ["-y", "@n24q02m/better-godot-mcp@latest"]
    }
  }
}
```

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
pnpm build
```

**Requirements:** Node.js 24+, pnpm 10+

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md)

## License

MIT - See [LICENSE](LICENSE)
