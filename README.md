# Better Godot MCP

mcp-name: io.github.n24q02m/better-godot-mcp

**Composite MCP server for Godot Engine -- 18 mega-tools for AI-assisted game development**

<!-- Badge Row 1: Status -->
[![CI](https://github.com/n24q02m/better-godot-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/n24q02m/better-godot-mcp/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/n24q02m/better-godot-mcp/graph/badge.svg?token=PF94LT0K2L)](https://codecov.io/gh/n24q02m/better-godot-mcp)
[![npm](https://img.shields.io/npm/v/@n24q02m/better-godot-mcp?logo=npm&logoColor=white)](https://www.npmjs.com/package/@n24q02m/better-godot-mcp)
[![Docker](https://img.shields.io/docker/v/n24q02m/better-godot-mcp?label=docker&logo=docker&logoColor=white&sort=semver)](https://hub.docker.com/r/n24q02m/better-godot-mcp)
[![License: MIT](https://img.shields.io/github/license/n24q02m/better-godot-mcp)](LICENSE)

<!-- Badge Row 2: Tech -->
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](#)
[![Node.js](https://img.shields.io/badge/Node.js-5FA04E?logo=nodedotjs&logoColor=white)](#)
[![Godot Engine](https://img.shields.io/badge/Godot_Engine-478CBF?logo=godotengine&logoColor=white)](#)
[![semantic-release](https://img.shields.io/badge/semantic--release-e10079?logo=semantic-release&logoColor=white)](https://github.com/python-semantic-release/python-semantic-release)
[![Renovate](https://img.shields.io/badge/renovate-enabled-1A1F6C?logo=renovatebot&logoColor=white)](https://developer.mend.io/)

<a href="https://glama.ai/mcp/servers/n24q02m/better-godot-mcp">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/n24q02m/better-godot-mcp/badge" alt="Better Godot MCP server" />
</a>

## Features

- **18 composite mega-tools** -- scene, node, script, shader, animation, tilemap, physics, audio, navigation, UI, and more
- **Full scene control** -- create, parse, and modify `.tscn` files directly without Godot running
- **GDScript CRUD** -- create, read, write, and attach scripts in a single call
- **Tiered token optimization** -- compressed descriptions + on-demand `help` tool

## Quick Start

### Claude Code Plugin (Recommended)

Via marketplace (includes skills: /build-scene, /debug-issue, /add-mechanic):

```bash
/plugins add n24q02m/claude-plugins
```

Or install this plugin only:

```bash
claude plugin add n24q02m/better-godot-mcp
```

### MCP Server

#### Option 1: npx

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

Other runners: `bun x`, `pnpm dlx`, `yarn dlx` also work.

#### Option 2: Docker

```jsonc
{
  "mcpServers": {
    "better-godot": {
      "command": "docker",
      "args": [
        "run", "-i", "--rm",
        "n24q02m/better-godot-mcp:latest"
      ]
    }
  }
}
```

> **Note:** Project path is passed via tool parameters (`project_path`), not environment variables. In Docker mode, mount your project directory.

## Tools

| Tool | Actions | Description |
|:-----|:--------|:------------|
| `project` | `info`, `version`, `run`, `stop`, `settings_get`, `settings_set`, `export` | Project metadata, run/stop, and settings |
| `scenes` | `create`, `list`, `info`, `delete`, `duplicate`, `set_main` | Scene file management |
| `nodes` | `add`, `remove`, `rename`, `list`, `set_property`, `get_property` | Scene tree node manipulation |
| `scripts` | `create`, `read`, `write`, `attach`, `list`, `delete` | GDScript file CRUD |
| `editor` | `launch`, `status` | Launch Godot editor and check status |
| `setup` | `detect_godot`, `check` | Detect Godot binary and check project |
| `config` | `status`, `set` | Server configuration |
| `resources` | `list`, `info`, `delete`, `import_config` | Resource file management |
| `input_map` | `list`, `add_action`, `remove_action`, `add_event` | Input action and event mapping |
| `signals` | `list`, `connect`, `disconnect` | Signal connections |
| `animation` | `create_player`, `add_animation`, `add_track`, `add_keyframe`, `list` | Animation players and tracks |
| `tilemap` | `create_tileset`, `add_source`, `set_tile`, `paint`, `list` | TileMap and TileSet management |
| `shader` | `create`, `read`, `write`, `get_params`, `list` | Shader file CRUD with Godot 4 syntax |
| `physics` | `layers`, `collision_setup`, `body_config`, `set_layer_name` | Collision layers and physics bodies |
| `audio` | `list_buses`, `add_bus`, `add_effect`, `create_stream` | Audio bus and effect management |
| `navigation` | `create_region`, `add_agent`, `add_obstacle` | Navigation regions, agents, and obstacles |
| `ui` | `create_control`, `set_theme`, `layout`, `list_controls` | UI control creation and theming |
| `help` | - | Get full documentation for any tool |

## Configuration

| Variable | Required | Default | Description |
|:---------|:---------|:--------|:------------|
| `GODOT_PROJECT_PATH` | No | - | Default project path (tools also accept `project_path` param) |
| `GODOT_PATH` | No | Auto-detected | Path to Godot binary |

### Limitations

- Requires Godot 4.x project structure
- Scene files (`.tscn`) are parsed/modified via text manipulation, not Godot's internal API
- `run`/`stop`/`export` actions require Godot binary to be installed
- Docker mode has limited filesystem access (mount your project directory)

## Build from Source

```bash
git clone https://github.com/n24q02m/better-godot-mcp.git
cd better-godot-mcp
npm install
npm run build
npm start
```

## Compatible With

[![Claude Code](https://img.shields.io/badge/Claude_Code-000000?logo=anthropic&logoColor=white)](#quick-start)
[![Claude Desktop](https://img.shields.io/badge/Claude_Desktop-F9DC7C?logo=anthropic&logoColor=black)](#quick-start)
[![Cursor](https://img.shields.io/badge/Cursor-000000?logo=cursor&logoColor=white)](#quick-start)
[![VS Code Copilot](https://img.shields.io/badge/VS_Code_Copilot-007ACC?logo=visualstudiocode&logoColor=white)](#quick-start)
[![Antigravity](https://img.shields.io/badge/Antigravity-4285F4?logo=google&logoColor=white)](#quick-start)
[![Gemini CLI](https://img.shields.io/badge/Gemini_CLI-8E75B2?logo=googlegemini&logoColor=white)](#quick-start)
[![OpenAI Codex](https://img.shields.io/badge/Codex-412991?logo=openai&logoColor=white)](#quick-start)
[![OpenCode](https://img.shields.io/badge/OpenCode-F7DF1E?logoColor=black)](#quick-start)

## Also by n24q02m

| Server | Description |
|--------|-------------|
| [wet-mcp](https://github.com/n24q02m/wet-mcp) | Web search, content extraction, and documentation indexing |
| [mnemo-mcp](https://github.com/n24q02m/mnemo-mcp) | Persistent AI memory with hybrid search and cross-machine sync |
| [better-notion-mcp](https://github.com/n24q02m/better-notion-mcp) | Markdown-first Notion API with 9 composite tools |
| [better-email-mcp](https://github.com/n24q02m/better-email-mcp) | Email (IMAP/SMTP) with multi-account and auto-discovery |
| [better-telegram-mcp](https://github.com/n24q02m/better-telegram-mcp) | Telegram dual-mode (Bot API + MTProto) with 6 composite tools |
| [better-code-review-graph](https://github.com/n24q02m/better-code-review-graph) | Knowledge graph for token-efficient code reviews |

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

MIT -- See [LICENSE](LICENSE).
