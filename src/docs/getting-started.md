# Getting Started

## Prerequisites

- Node.js >= 24
- Godot Engine >= 4.1 (optional for CLI tools, required for editor integration)

## Installation

### Via npx (recommended)
```bash
npx @anthropics/better-godot-mcp
```

### Via npm
```bash
npm install -g @anthropics/better-godot-mcp
better-godot-mcp
```

### Via Docker
```bash
docker run -i --rm n24q02m/better-godot-mcp
```

## Configuration

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `GODOT_PATH` | Path to Godot binary | No (auto-detected) |
| `GODOT_PROJECT_PATH` | Default project path | No |

### Godot Detection

The server automatically detects Godot in this order:
1. `GODOT_PATH` environment variable
2. System PATH
3. Platform-specific common locations

Use `setup.detect_godot` to verify detection.

## Quick Start

1. Start the MCP server
2. Use `setup.check` to verify your environment
3. Use `project.info` with your project path
4. Create scenes, scripts, and nodes with the respective tools
