/**
 * Better Godot MCP Server - Initialization
 *
 * Enhanced MCP server for Godot Engine with:
 * - Composite mega-tools (8 tools, ~20 actions)
 * - Cross-platform Godot binary detection
 * - CLI headless operations
 * - EditorPlugin TCP support (Phase 2)
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { detectGodot } from './godot/detector.js'
import type { GodotConfig } from './godot/types.js'
import { GodotMCPError } from './tools/helpers/errors.js'
import { pathExists } from './tools/helpers/paths.js'
import { registerTools } from './tools/registry.js'

const SERVER_NAME = 'better-godot-mcp'

function getVersion(): string {
  try {
    const __filename = fileURLToPath(import.meta.url)
    const __dirname = dirname(__filename)
    const pkgPath = join(__dirname, '..', 'package.json')
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
    return pkg.version ?? '0.0.0'
  } catch {
    return '0.0.0'
  }
}

export async function initServer(): Promise<Server> {
  try {
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

    // Resolve project path from env var (tools also accept project_path per call)
    const projectPath = process.env.GODOT_PROJECT_PATH ?? null

    if (projectPath) {
      if (!(await pathExists(join(projectPath, 'project.godot')))) {
        throw new GodotMCPError(
          `Invalid GODOT_PROJECT_PATH: "project.godot" not found in ${projectPath}`,
          'PROJECT_NOT_FOUND',
          'Ensure the path points to a valid Godot project directory containing project.godot',
        )
      }
    }

    const config: GodotConfig = {
      godotPath: detection?.path ?? null,
      godotVersion: detection?.version ?? null,
      projectPath,
      activePids: [],
    }

    // Create MCP server
    const server = new Server(
      {
        name: SERVER_NAME,
        version: getVersion(),
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

    console.error(`[${SERVER_NAME}] Server started (v${getVersion()})`)
    return server
  } catch (error) {
    console.error('Failed to initialize server:', error)
    throw error
  }
}
