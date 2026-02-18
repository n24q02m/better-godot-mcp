/**
 * Better Godot MCP Server - Initialization
 *
 * Enhanced MCP server for Godot Engine with:
 * - Composite mega-tools (8 tools, ~20 actions)
 * - Cross-platform Godot binary detection
 * - CLI headless operations
 * - EditorPlugin TCP support (Phase 2)
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { detectGodot } from './godot/detector.js'
import type { GodotConfig } from './godot/types.js'
import { registerTools } from './tools/registry.js'

const SERVER_NAME = 'better-godot-mcp'
const SERVER_VERSION = '0.1.0'

export async function initServer(): Promise<void> {
  // Detect Godot binary
  const detection = detectGodot()

  if (detection) {
    console.error(
      `[${SERVER_NAME}] Godot detected: ${detection.version.raw} at ${detection.path} (${detection.source})`,
    )
  } else {
    console.error(`[${SERVER_NAME}] Godot not found. CLI headless tools will be limited.`)
    console.error(`[${SERVER_NAME}] Set GODOT_PATH env var or install Godot.`)
  }

  // Build config
  const config: GodotConfig = {
    godotPath: detection?.path ?? null,
    godotVersion: detection?.version ?? null,
    projectPath: process.env.GODOT_PROJECT_PATH ?? null,
  }

  // Create MCP server
  const server = new Server(
    {
      name: SERVER_NAME,
      version: SERVER_VERSION,
    },
    {
      capabilities: {
        tools: {},
      },
    },
  )

  // Register all tools
  registerTools(server, config)

  // Connect via stdio
  const transport = new StdioServerTransport()
  await server.connect(transport)

  console.error(`[${SERVER_NAME}] Server started (v${SERVER_VERSION})`)
}

// Auto-start when run directly (not when imported as a module)
const isDirectRun = process.argv[1]?.endsWith('init-server.js') || process.argv[1]?.endsWith('cli.mjs')

if (isDirectRun) {
  initServer().catch((error) => {
    console.error('Failed to start Better Godot MCP Server:', error)
    process.exit(1)
  })
}
