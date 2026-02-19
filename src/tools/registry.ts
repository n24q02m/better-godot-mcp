/**
 * Tool Registry - Definitions and request handlers
 *
 * Follows MCP Server skill patterns:
 * - Compressed descriptions with redirect to help tool
 * - Annotations with all 5 fields (title, readOnlyHint, destructiveHint, idempotentHint, openWorldHint)
 * - Mega-tool annotations set for worst-case action
 */

import type { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import type { GodotConfig } from '../godot/types.js'
import { handleAnimation } from './composite/animation.js'
import { handleAudio } from './composite/audio.js'
import { handleConfig } from './composite/config.js'
import { handleEditor } from './composite/editor.js'
import { handleHelp } from './composite/help.js'
import { handleInputMap } from './composite/input-map.js'
import { handleNavigation } from './composite/navigation.js'
import { handleNodes } from './composite/nodes.js'
import { handlePhysics } from './composite/physics.js'
import { handleProject } from './composite/project.js'
import { handleResources } from './composite/resources.js'
import { handleScenes } from './composite/scenes.js'
import { handleScripts } from './composite/scripts.js'
import { handleSetup } from './composite/setup.js'
import { handleShader } from './composite/shader.js'
import { handleSignals } from './composite/signals.js'
import { handleTilemap } from './composite/tilemap.js'
import { handleUI } from './composite/ui.js'
import { P3_TOOLS } from './definitions/advanced.js'
import { P0_TOOLS } from './definitions/core.js'
import { P1_TOOLS } from './definitions/extended.js'
import { P2_TOOLS } from './definitions/specialized.js'
import { formatError, GodotMCPError } from './helpers/errors.js'

export const TOOLS = [...P0_TOOLS, ...P1_TOOLS, ...P2_TOOLS, ...P3_TOOLS]

/**
 * Register all tools with the MCP server
 */
export function registerTools(server: Server, config: GodotConfig): void {
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS,
  }))

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args = {} } = request.params

    try {
      switch (name) {
        // P0 - Core
        case 'project':
          return await handleProject(args.action as string, args as Record<string, unknown>, config)
        case 'scenes':
          return await handleScenes(args.action as string, args as Record<string, unknown>, config)
        case 'nodes':
          return await handleNodes(args.action as string, args as Record<string, unknown>, config)
        case 'scripts':
          return await handleScripts(args.action as string, args as Record<string, unknown>, config)
        case 'editor':
          return await handleEditor(args.action as string, args as Record<string, unknown>, config)
        case 'setup':
          return await handleSetup(args.action as string, args as Record<string, unknown>, config)
        case 'config':
          return await handleConfig(args.action as string, args as Record<string, unknown>, config)
        case 'help':
          return await handleHelp(
            (args.action as string) || (args.tool_name as string),
            args as Record<string, unknown>,
          )

        // P1 - Extended
        case 'resources':
          return await handleResources(args.action as string, args as Record<string, unknown>, config)
        case 'input_map':
          return await handleInputMap(args.action as string, args as Record<string, unknown>, config)
        case 'signals':
          return await handleSignals(args.action as string, args as Record<string, unknown>, config)

        // P2 - Specialized
        case 'animation':
          return await handleAnimation(args.action as string, args as Record<string, unknown>, config)
        case 'tilemap':
          return await handleTilemap(args.action as string, args as Record<string, unknown>, config)
        case 'shader':
          return await handleShader(args.action as string, args as Record<string, unknown>, config)
        case 'physics':
          return await handlePhysics(args.action as string, args as Record<string, unknown>, config)

        // P3 - Advanced
        case 'audio':
          return await handleAudio(args.action as string, args as Record<string, unknown>, config)
        case 'navigation':
          return await handleNavigation(args.action as string, args as Record<string, unknown>, config)
        case 'ui':
          return await handleUI(args.action as string, args as Record<string, unknown>, config)

        default:
          throw new GodotMCPError(
            `Unknown tool: ${name}`,
            'INVALID_ACTION',
            `Available tools: ${TOOLS.map((t) => t.name).join(', ')}`,
          )
      }
    } catch (error) {
      return formatError(error)
    }
  })
}
