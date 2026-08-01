# Better Godot MCP

mcp-name: io.github.n24q02m/better-godot-mcp

**Composite MCP server for Godot Engine -- 17 composite tools for AI-assisted game development.**

<!-- Badge Row 1: Status -->
[![CI](https://github.com/n24q02m/better-godot-mcp/actions/workflows/ci.yml/badge.svg)](https://github.com/n24q02m/better-godot-mcp/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/n24q02m/better-godot-mcp/graph/badge.svg?token=PF94LT0K2L)](https://codecov.io/gh/n24q02m/better-godot-mcp)
[![npm](https://img.shields.io/npm/v/@n24q02m/better-godot-mcp?logo=npm&logoColor=white)](https://www.npmjs.com/package/@n24q02m/better-godot-mcp)
[![Docker](https://img.shields.io/docker/v/n24q02m/better-godot-mcp?label=docker&logo=docker&logoColor=white&sort=semver)](https://hub.docker.com/r/n24q02m/better-godot-mcp)
[![License: Apache-2.0](https://img.shields.io/github/license/n24q02m/better-godot-mcp)](LICENSE)

<!-- Badge Row 2: Tech -->
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](#)
[![Node.js](https://img.shields.io/badge/Node.js-5FA04E?logo=nodedotjs&logoColor=white)](#)
[![Godot Engine](https://img.shields.io/badge/Godot_Engine-478CBF?logo=godotengine&logoColor=white)](#)
[![semantic-release](https://img.shields.io/badge/semantic--release-e10079?logo=semantic-release&logoColor=white)](https://github.com/python-semantic-release/python-semantic-release)
[![Renovate](https://img.shields.io/badge/renovate-enabled-1A1F6C?logo=renovatebot&logoColor=white)](https://developer.mend.io/)

<!-- BEGIN: AUTO-GENERATED-CROSS-PROMO -->
<details>
  <summary><strong>Sister projects from n24q02m</strong> (click to expand)</summary>

| Project | Tagline | Tag |
|---|---|---|
| [agent-chat-plugin](https://github.com/n24q02m/agent-chat-plugin) | Peer AI agents chat in a shared folder — no human relay, no orchestrator, wor... | Tooling |
| [better-code-review-graph](https://github.com/n24q02m/better-code-review-graph) | Knowledge graph for token-efficient code reviews -- semantic search and call-... | MCP |
| [better-drive](https://github.com/n24q02m/better-drive) | 2-way Google Drive sync with .driveignore filter — rclone engine, Windows tray | Tooling |
| [better-email-mcp](https://github.com/n24q02m/better-email-mcp) | IMAP/SMTP email for AI agents -- read, send, organize folders, and manage att... | MCP |
| [better-godot-mcp](https://github.com/n24q02m/better-godot-mcp) | Composite MCP server for Godot Engine -- 17 composite tools for AI-assisted g... | MCP |
| [better-notion-mcp](https://github.com/n24q02m/better-notion-mcp) | Markdown-first Notion for AI agents -- pages, databases, blocks, and comments... | MCP |
| [better-semantic-release](https://github.com/n24q02m/better-semantic-release) | Drop-in python-semantic-release fork with built-in release-safety guards (orp... | Tooling |
| [better-telegram-mcp](https://github.com/n24q02m/better-telegram-mcp) | Telegram for AI agents -- messages, chats, media, and contacts across both bo... | MCP |
| [better-workspace-mcp](https://github.com/n24q02m/better-workspace-mcp) | Google Workspace MCP server (Docs/Drive/Calendar/Gmail/Sheets/Slides/Tasks/Ch... | MCP |
| [claude-plugins](https://github.com/n24q02m/claude-plugins) | Claude Code plugin marketplace for the n24q02m MCP servers -- install web sea... | Marketplace |
| [imagine-mcp](https://github.com/n24q02m/imagine-mcp) | Image and video understanding + generation for AI agents -- across Gemini, Op... | MCP |
| [jules-task-archiver](https://github.com/n24q02m/jules-task-archiver) | Chrome Extension for bulk operations on Jules tasks via batchexecute API -- a... | Tooling |
| [mcp-core](https://github.com/n24q02m/mcp-core) | Shared foundation for building MCP servers -- Streamable HTTP transport, OAut... | MCP |
| [mnemo-mcp](https://github.com/n24q02m/mnemo-mcp) | Persistent AI memory with hybrid search and embedded sync. Open, free, unlimi... | MCP |
| [qwen3-embed](https://github.com/n24q02m/qwen3-embed) | Lightweight Qwen3 text embedding and reranking via ONNX Runtime and GGUF | Library |
| [skret](https://github.com/n24q02m/skret) | Secrets without the server. | CLI |
| [tacet](https://github.com/n24q02m/tacet) | A self-distilling neuro-symbolic cascade that amortises LLM cost across knowl... | Tooling |
| [web-core](https://github.com/n24q02m/web-core) | Shared web infrastructure package for search, scraping, HTTP security, and st... | Library |
| [wet-mcp](https://github.com/n24q02m/wet-mcp) | Open-source MCP server for AI agents: web search, content extraction, and lib... | MCP |

</details>
<!-- END: AUTO-GENERATED-CROSS-PROMO -->

## Table of contents

- [Features](#features)
- [Install](#install)
- [Smithery](#smithery)
- [Documentation](#documentation)
- [Tools](#tools)
- [Comparison](#comparison)
- [Configuration](#configuration)
- [CLI](#cli)
- [Security](#security)
- [Build from source](#build-from-source)
- [Trust model](#trust-model)
- [License](#license)



<a href="https://glama.ai/mcp/servers/n24q02m/better-godot-mcp">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/n24q02m/better-godot-mcp/badge" alt="Better Godot MCP server" />
</a>

## Features

- **17 composite mega-tools** -- scene, node, script, shader, animation, tilemap, physics, audio, navigation, UI, and more
- **Full scene control** -- create, parse, and modify `.tscn` files directly without Godot running
- **GDScript CRUD** -- create, read, write, and attach scripts in a single call
- **Tiered token optimization** -- compressed descriptions + on-demand `help` tool

## Install

Runs over **stdio** by default. No credentials, no account, no relay -- the server reads and writes your local Godot project files directly. Godot 4.x is optional (only `run`/`stop`/`export` and `editor` actions need the binary).

### Via npx (recommended)

```bash
npx -y @n24q02m/better-godot-mcp@latest
```

### MCP client config

Add to your client's MCP config (Claude Code, Cursor, Windsurf, Codex, `mcp.json`):

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

`GODOT_PROJECT_PATH` is optional -- every tool also accepts a `project_path` argument per call.

### Via Docker

```bash
docker run -i --rm -v /path/to/your/godot/project:/project n24q02m/better-godot-mcp
```

The image is published for `amd64` and `arm64`. Mount your project directory so the server can read and write scene, script, and resource files.

## Smithery

better-godot-mcp ships a [`smithery.yaml`](smithery.yaml) so it can be discovered and deployed through [Smithery](https://smithery.ai/). Smithery launches the server over **stdio** via `npx -y @n24q02m/better-godot-mcp`, and no configuration is required to start -- the server has no credentials and reads your local Godot project files directly.

## Documentation

Full setup guide at **[mcp.n24q02m.com/servers/better-godot-mcp/setup/](https://mcp.n24q02m.com/servers/better-godot-mcp/setup/)** -- install steps for Claude Code, Codex, Gemini CLI, Cursor, Windsurf, and `mcp.json`.

**Install with AI agent** -- paste this to your AI coding agent:

> Install MCP server `better-godot-mcp` following the steps at
> https://raw.githubusercontent.com/n24q02m/claude-plugins/main/plugins/better-godot-mcp/setup-with-agent.md

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

## Comparison

How better-godot-mcp stacks up against direct competitors in each pillar:

| Capability | better-godot-mcp | Coding-Solo/godot-mcp | bradypp/godot-mcp | tugcantopaloglu/godot-mcp |
|---|---|---|---|---|
| Scene file management | Yes (`scenes`: create/list/info/delete/duplicate/set_main) | Yes (create/save) | Yes (create/save) | Yes (create/read/modify) |
| Node tree manipulation | Yes (`nodes`: add/remove/rename/list/get+set_property) | Partial (add only) | Yes (add/edit/remove) | Yes (add/remove/reparent) |
| GDScript file CRUD | Yes (`scripts`: create/read/write/attach/list/delete) | No | No | Partial (create from template + runtime eval) |
| Shader file CRUD | Yes (`shader`: create/read/write/get_params/list) | No | No | Partial (create/read .gdshader) |
| Animation authoring | Yes (`animation`: player/track/keyframe) | No | No | Yes (player/tween/state machine) |
| TileMap / TileSet | Yes (`tilemap`: tileset/source/set_tile/paint) | No | No | Yes (TileMapLayer cells) |
| Physics layers / bodies | Yes (`physics`: layers/collision/body_config) | No | No | Yes (collision/joints/raycast) |
| Audio bus management | Yes (`audio`: buses/effects/streams) | No | No | Yes (buses/routing/effects) |
| Navigation setup | Yes (`navigation`: region/agent/obstacle) | No | No | Yes (navigation) |
| UI control authoring | Yes (`ui`: control/theme/layout) | No | Partial (via add node) | Yes (controls/themes/menus) |
| Input map editing | Yes (`input_map`: action/event) | No | No | Yes (actions/key bindings) |
| Signal connections | Yes (`signals`: connect/disconnect/list) | No | No | Yes (connect/emit/await) |
| Launch editor / run project | Yes (`editor`, `project` run/stop) | Yes | Yes | Yes |
| Works without running editor | Yes (text-based `.tscn` parsing) | Yes (headless GDScript bridge) | Yes (headless GDScript bridge) | Partial (CLI headless or live TCP socket) |
| No credentials stored (TC-Local) | Yes | Yes | Yes | Yes |
| stdio + HTTP transports | Yes (stdio default + `--http`) | No (stdio only) | No (stdio only) | No (stdio only) |
| Docker image (amd64 + arm64) | Yes | No | No | No |
| Token-tiered tool descriptions | Yes (compact + on-demand `help`) | No | No | No |

## Configuration

The Godot binary is auto-detected from common install locations and `PATH`. No environment variables are required for basic usage. Optionally set `GODOT_PROJECT_PATH` and `GODOT_PATH` to override the defaults.

| Variable | Required | Default | Description |
|:---------|:---------|:--------|:------------|
| `GODOT_PROJECT_PATH` | No | - | Default project path (tools also accept a `project_path` param) |
| `GODOT_PATH` | No | Auto-detected | Path to the Godot binary |

### HTTP transport

The server runs over stdio by default. To serve over Streamable HTTP instead, pass `--http` or set `MCP_TRANSPORT=http` (`TRANSPORT_MODE=http` is also accepted). HTTP mode exposes an unauthenticated `/mcp` endpoint -- there are no credentials to protect, so it is meant for trusted local or self-hosted use.

| Variable | Required | Default | Description |
|:---------|:---------|:--------|:------------|
| `MCP_TRANSPORT` | No | `stdio` | Set to `http` for Streamable HTTP transport |
| `PORT` | No | `0` (auto-assign) | HTTP port (HTTP mode only) |
| `HOST` | No | Server default | HTTP host (HTTP mode only) |

### Limitations

- Requires Godot 4.x project structure
- Scene files (`.tscn`) are parsed/modified via text manipulation, not Godot's internal API
- `run`/`stop`/`export` actions require Godot binary to be installed
- Docker mode has limited filesystem access (mount your project directory)

## CLI

The `better-godot-mcp` binary runs the MCP server by default (stdio; add `--http` for Streamable HTTP). It also exposes two diagnostic subcommands for checking your Godot environment before wiring up an MCP client.

| Command | Description |
|:--------|:------------|
| `better-godot-mcp` | Start the MCP server (stdio default; `--http` for Streamable HTTP) |
| `better-godot-mcp detect` | Print the detected Godot binary as JSON (path, version, source); exits non-zero when none is found |
| `better-godot-mcp doctor` | Health-check the Godot binary and the current project (`GODOT_PROJECT_PATH`, else the working directory) |

```bash
# Detect the Godot binary (JSON output)
npx -y @n24q02m/better-godot-mcp detect
```

```json
{
  "found": true,
  "path": "/path/to/godot",
  "version": {
    "major": 4,
    "minor": 6,
    "patch": 3,
    "label": "stable.official",
    "raw": "4.6.3.stable.official"
  },
  "source": "system"
}
```

```bash
# Health-check the Godot binary and project
npx -y @n24q02m/better-godot-mcp doctor
```

```text
[ok] godot binary: /path/to/godot (source: system)
[ok] godot version: 4.6.3.stable.official
[warn] project: no project.godot found at /path/to/cwd (set GODOT_PROJECT_PATH)
```

`detect` exits `1` when no Godot binary is found; `doctor` exits `1` when the binary is missing (a missing `project.godot` is only a warning).

## Security

- **Binary detection** -- Multi-path Godot detection (env, PATH, common locations)
- **Project validation** -- Verifies project.godot exists before operations
- **Cross-platform** -- Windows, macOS, Linux path handling

## Build from source

```bash
git clone https://github.com/n24q02m/better-godot-mcp.git
cd better-godot-mcp
bun install
bun run dev          # stdio mode (default)
bun run dev:http     # Streamable HTTP mode
```

## Trust model

This plugin implements **TC-Local** (no auth required -- no credentials stored). See [the trust model reference](https://mcp.n24q02m.com/servers/mcp-core/trust-model/) for full classification.

| Mode | Storage | Encryption | Who can read your data? |
|---|---|---|---|
| stdio (default) | N/A (no credentials) | N/A | N/A |
| HTTP self-host | N/A (no credentials) | N/A | N/A |

## License

Apache-2.0 -- See [LICENSE](LICENSE).
