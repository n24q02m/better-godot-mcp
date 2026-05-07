/**
 * Better Godot MCP Server - Initialization
 *
 * Enhanced MCP server for Godot Engine with:
 * - Composite mega-tools (8 tools, ~20 actions)
 * - Cross-platform Godot binary detection
 * - CLI headless operations
 * - EditorPlugin TCP support (Phase 2)
 *
 * Defaults to stdio mode. Use --http flag, MCP_TRANSPORT=http, or TRANSPORT_MODE=http for HTTP mode.
 */

import { join } from 'node:path'
import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import pkg from '../package.json' with { type: 'json' }
import { detectGodot } from './godot/detector.js'
import type { GodotConfig } from './godot/types.js'
import { registerTools } from './tools/registry.js'

const SERVER_NAME = 'better-godot-mcp'

function getVersion(): string {
  return pkg.version ?? '0.0.0'
}

/**
 * Configure mcp-core storage paths to align with Python MCP servers on Windows.
 * This must be called before any mcp-core storage operations.
 */
async function configureStorage(): Promise<void> {
  if (process.platform === 'win32' && process.env.LOCALAPPDATA) {
    try {
      // Use import.meta.resolve to find the physical path of mcp-core,
      // bypassing the strict "exports" map which blocks deep imports.
      // This is necessary because mcp-core v1.13.0 does not export setConfigPath from its main entry.
      const pkgPath = import.meta.resolve('@n24q02m/mcp-core')
      const configFilePath = pkgPath.replace('index.js', 'storage/config-file.js')
      const { setConfigPath } = await import(configFilePath)

      const configPath = join(process.env.LOCALAPPDATA, 'mcp', 'config.enc')
      setConfigPath(configPath)
      console.error(`[${SERVER_NAME}] Windows config path overridden to ${configPath}`)
    } catch (error) {
      console.error(`[${SERVER_NAME}] Failed to override config path:`, error)
    }
  }
}

export function createGodotServer(): Server {
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

  return server
}

export async function initServer(): Promise<void> {
  const isHttp =
    process.argv.includes('--http') || process.env.MCP_TRANSPORT === 'http' || process.env.TRANSPORT_MODE === 'http'

  await configureStorage()

  try {
    if (!isHttp) {
      // Direct MCP SDK stdio transport (no daemon proxy hop).
      // See spec 2026-05-01-stdio-pure-http-multiuser.md §5.2.2.
      const server = createGodotServer()
      const transport = new StdioServerTransport()
      await server.connect(transport)
      console.error(`[${SERVER_NAME}] Server started in stdio mode (v${getVersion()})`)
      return
    } else {
      const { runHttpServer } = await import('@n24q02m/mcp-core')
      const port = process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 0
      const host = process.env.HOST
      const handle = await runHttpServer(
        // Godot uses the lower-level Server; runHttpServer only calls `.connect(transport)`
        // which both Server and McpServer expose with the same signature.
        () => createGodotServer() as unknown as import('@modelcontextprotocol/sdk/server/mcp.js').McpServer,
        {
          serverName: SERVER_NAME,
          port,
          host,
          // No relaySchema -> no auth, no credential form (godot has no credentials).
        },
      )
      console.error(
        `[${SERVER_NAME}] Server started in HTTP mode (v${getVersion()}) on http://${handle.host}:${handle.port}/mcp`,
      )
      // Keep process alive until SIGINT/SIGTERM.
      await new Promise<void>((resolve) => {
        const shutdown = async (): Promise<void> => {
          await handle.close()
          resolve()
        }
        process.once('SIGINT', shutdown)
        process.once('SIGTERM', shutdown)
      })
    }
  } catch (error) {
    console.error('Failed to initialize server:', error)
    throw error
  }
}
