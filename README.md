[![MseeP.ai Security Assessment Badge](https://mseep.net/pr/n24q02m-better-godot-mcp-badge.png)](https://mseep.ai/app/n24q02m-better-godot-mcp)

# Better Godot MCP

mcp-name: io.github.n24q02m/better-godot-mcp

**Composite MCP server for Godot Engine -- 17 mega-tools for AI-assisted game development**

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

- **17 composite mega-tools** -- scene, node, script, shader, animation, tilemap, physics, audio, navigation, UI, and more
- **Full scene control** -- create, parse, and modify `.tscn` files directly without Godot running
- **GDScript CRUD** -- create, read, write, and attach scripts in a single call
- **Tiered token optimization** -- compressed descriptions + on-demand `help` tool

## Status

> **2026-05-02 -- Architecture stabilization update**
>
> Past months saw significant churn around credential handling and the daemon-bridge auto-spawn pattern. This caused multi-process races, browser tab spam, and inconsistent setup UX across plugins. **As of v\<auto\>, the architecture is stable**: 2 clean modes (stdio + HTTP), no daemon-bridge layer, no auto-spawn from stdio.
>
> Apologies for the instability period. If you encountered issues with prior versions, please update to v\<auto\>+ and follow the current `docs/setup-manual.md` -- most prior workarounds are no longer needed.
>
> **Related plugins from the same author**:
> - [wet-mcp](https://github.com/n24q02m/wet-mcp) -- Web search + content extraction
> - [mnemo-mcp](https://github.com/n24q02m/mnemo-mcp) -- Persistent AI memory
> - [imagine-mcp](https://github.com/n24q02m/imagine-mcp) -- Image/video understanding + generation
> - [better-notion-mcp](https://github.com/n24q02m/better-notion-mcp) -- Notion API
> - [better-email-mcp](https://github.com/n24q02m/better-email-mcp) -- Email management
> - [better-telegram-mcp](https://github.com/n24q02m/better-telegram-mcp) -- Telegram
> - [better-godot-mcp](https://github.com/n24q02m/better-godot-mcp) -- Godot Engine
> - [better-code-review-graph](https://github.com/n24q02m/better-code-review-graph) -- Code review knowledge graph
>
> All plugins share the same architecture -- install once, learn pattern transfers.

## Setup

- **Stdio mode** (default) -- no auth required, just works. See [setup-manual.md](docs/setup-manual.md).
- **HTTP mode** (optional) -- for claude.ai web compatibility or multi-session sharing. See [setup-manual.md](docs/setup-manual.md).

**With AI Agent** -- copy and send this to your AI agent:

> Please set up @n24q02m/better-godot-mcp for me. Follow this guide:
> https://raw.githubusercontent.com/n24q02m/better-godot-mcp/main/docs/setup-with-agent.md

**Manual Setup** -- follow [docs/setup-manual.md](docs/setup-manual.md)

## Tools

| Tool | Actions | Description |
|:-----|:--------|:------------|
| `project` | `info`, `version`, `run`, `stop`, `settings_get`, `settings_set`, `export` | Project metadata, run/stop, and settings |
| `scenes` | `create`, `list`, `info`, `delete`, `duplicate`, `set_main` | Scene file management |
| `nodes` | `add`, `remove`, `rename`, `list`, `set_property`, `get_property` | Scene tree node manipulation |
| `scripts` | `create`, `read`, `write`, `attach`, `list`, `delete` | GDScript file CRUD |
| `editor` | `launch`, `status` | Launch Godot editor and check status |
| `config` | `status`, `set`, `detect_godot`, `check` | Server configuration and environment detection |
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

Godot binary is auto-detected from common install locations and `PATH`. No environment variables are required for basic usage. Optionally set `GODOT_PROJECT_PATH` and `GODOT_PATH` to override defaults.

| Variable | Required | Default | Description |
|:---------|:---------|:--------|:------------|
| `GODOT_PROJECT_PATH` | No | - | Default project path (tools also accept `project_path` param) |
| `GODOT_PATH` | No | Auto-detected | Path to Godot binary |

### Limitations

- Requires Godot 4.x project structure
- Scene files (`.tscn`) are parsed/modified via text manipulation, not Godot's internal API
- `run`/`stop`/`export` actions require Godot binary to be installed
- Docker mode has limited filesystem access (mount your project directory)

## Security

- **Binary detection** -- Multi-path Godot detection (env, PATH, common locations)
- **Project validation** -- Verifies project.godot exists before operations
- **Cross-platform** -- Windows, macOS, Linux path handling

## Build from Source

```bash
git clone https://github.com/n24q02m/better-godot-mcp.git
cd better-godot-mcp
bun install
bun run dev
```

## Trust Model

This plugin implements **TC-Local** (no auth required -- no credentials stored). See [mcp-core/docs/TRUST-MODEL.md](https://github.com/n24q02m/mcp-core/blob/main/docs/TRUST-MODEL.md) for full classification.

| Mode | Storage | Encryption | Who can read your data? |
|---|---|---|---|
| stdio (default) | N/A (no credentials) | N/A | N/A |
| HTTP self-host | N/A (no credentials) | N/A | N/A |

## License

MIT -- See [LICENSE](LICENSE).
