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
import { formatError, GodotMCPError } from './helpers/errors.js'

// =============================================
// P0 - Core Tools (8)
// =============================================

const P0_TOOLS = [
  {
    name: 'project',
    description:
      'Godot project ops. Actions: info|version|run|stop|settings_get|settings_set|export. Use help tool for full docs.',
    annotations: {
      title: 'Project',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
    inputSchema: {
      type: 'object' as const,
      properties: {
        action: {
          type: 'string',
          enum: ['info', 'version', 'run', 'stop', 'settings_get', 'settings_set', 'export'],
          description: 'Action to perform',
        },
        project_path: { type: 'string', description: 'Path to Godot project directory' },
        key: { type: 'string', description: 'Settings key (for settings_get/set)' },
        value: { type: 'string', description: 'Settings value (for settings_set)' },
        preset: { type: 'string', description: 'Export preset name (for export)' },
        output_path: { type: 'string', description: 'Export output path (for export)' },
      },
      required: ['action'],
    },
  },
  {
    name: 'scenes',
    description: 'Scene file ops. Actions: create|list|info|delete|duplicate|set_main. Use help tool for full docs.',
    annotations: {
      title: 'Scenes',
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: false,
    },
    inputSchema: {
      type: 'object' as const,
      properties: {
        action: {
          type: 'string',
          enum: ['create', 'list', 'info', 'delete', 'duplicate', 'set_main'],
          description: 'Action to perform',
        },
        project_path: { type: 'string', description: 'Path to Godot project directory' },
        scene_path: { type: 'string', description: 'Relative scene file path' },
        root_type: { type: 'string', description: 'Root node type for create (default: Node2D)' },
        root_name: { type: 'string', description: 'Root node name for create' },
        new_path: { type: 'string', description: 'Destination path (for duplicate)' },
      },
      required: ['action'],
    },
  },
  {
    name: 'nodes',
    description:
      'Scene node ops. Actions: add|remove|rename|list|set_property|get_property. Use help tool for full docs.',
    annotations: {
      title: 'Nodes',
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: false,
    },
    inputSchema: {
      type: 'object' as const,
      properties: {
        action: {
          type: 'string',
          enum: ['add', 'remove', 'rename', 'list', 'set_property', 'get_property'],
          description: 'Action to perform',
        },
        project_path: { type: 'string', description: 'Path to Godot project directory' },
        scene_path: { type: 'string', description: 'Path to scene file' },
        name: { type: 'string', description: 'Node name' },
        type: { type: 'string', description: 'Node type (for add, default: Node)' },
        parent: { type: 'string', description: 'Parent node path (for add, default: .)' },
        new_name: { type: 'string', description: 'New name (for rename)' },
        property: { type: 'string', description: 'Property name (for get/set_property)' },
        value: { type: 'string', description: 'Property value (for set_property)' },
      },
      required: ['action'],
    },
  },
  {
    name: 'scripts',
    description: 'GDScript CRUD. Actions: create|read|write|attach|list|delete. Use help tool for full docs.',
    annotations: {
      title: 'Scripts',
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: false,
    },
    inputSchema: {
      type: 'object' as const,
      properties: {
        action: {
          type: 'string',
          enum: ['create', 'read', 'write', 'attach', 'list', 'delete'],
          description: 'Action to perform',
        },
        project_path: { type: 'string', description: 'Path to Godot project directory' },
        script_path: { type: 'string', description: 'Path to GDScript file' },
        extends: { type: 'string', description: 'Base class for create (default: Node)' },
        content: { type: 'string', description: 'Script content (for create/write)' },
        scene_path: { type: 'string', description: 'Scene file path (for attach)' },
        node_name: { type: 'string', description: 'Target node name (for attach)' },
      },
      required: ['action'],
    },
  },
  {
    name: 'editor',
    description: 'Godot editor control. Actions: launch|status. Use help tool for full docs.',
    annotations: {
      title: 'Editor',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: 'object' as const,
      properties: {
        action: { type: 'string', enum: ['launch', 'status'], description: 'Action to perform' },
        project_path: { type: 'string', description: 'Path to Godot project directory' },
      },
      required: ['action'],
    },
  },
  {
    name: 'setup',
    description: 'Environment setup. Actions: detect_godot|check. Use help tool for full docs.',
    annotations: {
      title: 'Setup',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: 'object' as const,
      properties: {
        action: { type: 'string', enum: ['detect_godot', 'check'], description: 'Action to perform' },
      },
      required: ['action'],
    },
  },
  {
    name: 'config',
    description: 'Server config. Actions: status|set. Use help tool for full docs.',
    annotations: {
      title: 'Config',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: 'object' as const,
      properties: {
        action: { type: 'string', enum: ['status', 'set'], description: 'Action to perform' },
        key: { type: 'string', description: 'Config key (for set)' },
        value: { type: 'string', description: 'Config value (for set)' },
      },
      required: ['action'],
    },
  },
  {
    name: 'help',
    description: 'Full documentation for a tool. Use when compressed descriptions are insufficient.',
    annotations: {
      title: 'Help',
      readOnlyHint: true,
      destructiveHint: false,
      idempotentHint: true,
      openWorldHint: false,
    },
    inputSchema: {
      type: 'object' as const,
      properties: {
        tool_name: {
          type: 'string',
          enum: [
            'project',
            'scenes',
            'nodes',
            'scripts',
            'editor',
            'setup',
            'config',
            'help',
            'resources',
            'input_map',
            'signals',
            'animation',
            'tilemap',
            'shader',
            'physics',
            'audio',
            'navigation',
            'ui',
          ],
          description: 'Tool to get documentation for',
        },
      },
      required: ['tool_name'],
    },
  },
]

// =============================================
// P1 - Extended Tools (3)
// =============================================

const P1_TOOLS = [
  {
    name: 'resources',
    description: 'Resource file management. Actions: list|info|delete|import_config. Use help tool for full docs.',
    annotations: {
      title: 'Resources',
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: false,
    },
    inputSchema: {
      type: 'object' as const,
      properties: {
        action: { type: 'string', enum: ['list', 'info', 'delete', 'import_config'], description: 'Action to perform' },
        project_path: { type: 'string', description: 'Path to Godot project directory' },
        resource_path: { type: 'string', description: 'Path to resource file' },
        type: { type: 'string', description: 'Filter by type: image, audio, font, shader, scene, resource (for list)' },
      },
      required: ['action'],
    },
  },
  {
    name: 'input_map',
    description:
      'Input action management. Actions: list|add_action|remove_action|add_event. Use help tool for full docs.',
    annotations: {
      title: 'Input Map',
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: false,
    },
    inputSchema: {
      type: 'object' as const,
      properties: {
        action: {
          type: 'string',
          enum: ['list', 'add_action', 'remove_action', 'add_event'],
          description: 'Action to perform',
        },
        project_path: { type: 'string', description: 'Path to Godot project directory' },
        action_name: { type: 'string', description: 'Input action name' },
        deadzone: { type: 'number', description: 'Deadzone value (for add_action, default: 0.5)' },
        event_type: { type: 'string', description: 'Event type: key, mouse, joypad (for add_event)' },
        event_value: { type: 'string', description: 'Event value, e.g., KEY_SPACE (for add_event)' },
      },
      required: ['action'],
    },
  },
  {
    name: 'signals',
    description: 'Signal connection management. Actions: list|connect|disconnect. Use help tool for full docs.',
    annotations: {
      title: 'Signals',
      readOnlyHint: false,
      destructiveHint: true,
      idempotentHint: false,
      openWorldHint: false,
    },
    inputSchema: {
      type: 'object' as const,
      properties: {
        action: { type: 'string', enum: ['list', 'connect', 'disconnect'], description: 'Action to perform' },
        project_path: { type: 'string', description: 'Path to Godot project directory' },
        scene_path: { type: 'string', description: 'Path to scene file' },
        signal: { type: 'string', description: 'Signal name' },
        from: { type: 'string', description: 'Source node path' },
        to: { type: 'string', description: 'Target node path' },
        method: { type: 'string', description: 'Target method name' },
        flags: { type: 'number', description: 'Connection flags' },
      },
      required: ['action'],
    },
  },
]

// =============================================
// P2 - Specialized Tools (4)
// =============================================

const P2_TOOLS = [
  {
    name: 'animation',
    description:
      'Animation management. Actions: create_player|add_animation|add_track|add_keyframe|list. Use help tool for full docs.',
    annotations: {
      title: 'Animation',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
    inputSchema: {
      type: 'object' as const,
      properties: {
        action: {
          type: 'string',
          enum: ['create_player', 'add_animation', 'add_track', 'add_keyframe', 'list'],
          description: 'Action to perform',
        },
        project_path: { type: 'string', description: 'Path to Godot project directory' },
        scene_path: { type: 'string', description: 'Path to scene file' },
        name: { type: 'string', description: 'AnimationPlayer node name' },
        parent: { type: 'string', description: 'Parent node path' },
        anim_name: { type: 'string', description: 'Animation name' },
        duration: { type: 'number', description: 'Animation duration in seconds' },
        loop: { type: 'boolean', description: 'Whether animation loops' },
        track_type: { type: 'string', description: 'Track type: value, method, bezier' },
        node_path: { type: 'string', description: 'Target node path for track' },
        property: { type: 'string', description: 'Target property for track' },
      },
      required: ['action'],
    },
  },
  {
    name: 'tilemap',
    description:
      'TileSet and TileMap management. Actions: create_tileset|add_source|set_tile|paint|list. Use help tool for full docs.',
    annotations: {
      title: 'TileMap',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
    inputSchema: {
      type: 'object' as const,
      properties: {
        action: {
          type: 'string',
          enum: ['create_tileset', 'add_source', 'set_tile', 'paint', 'list'],
          description: 'Action to perform',
        },
        project_path: { type: 'string', description: 'Path to Godot project directory' },
        scene_path: { type: 'string', description: 'Path to scene file (for list, paint)' },
        tileset_path: { type: 'string', description: 'Path to TileSet .tres file (for create_tileset, add_source)' },
        texture_path: { type: 'string', description: 'Texture source path (for add_source)' },
        tile_size: { type: 'number', description: 'Tile size in pixels (default: 16, for create_tileset)' },
      },
      required: ['action'],
    },
  },
  {
    name: 'shader',
    description: 'Godot shader management. Actions: create|read|write|get_params|list. Use help tool for full docs.',
    annotations: {
      title: 'Shader',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
    inputSchema: {
      type: 'object' as const,
      properties: {
        action: {
          type: 'string',
          enum: ['create', 'read', 'write', 'get_params', 'list'],
          description: 'Action to perform',
        },
        project_path: { type: 'string', description: 'Path to Godot project directory' },
        shader_path: { type: 'string', description: 'Path to .gdshader file' },
        shader_type: {
          type: 'string',
          description: 'Shader type: canvas_item, spatial, particles, sky, fog (for create)',
        },
        content: { type: 'string', description: 'Shader content (for create/write)' },
      },
      required: ['action'],
    },
  },
  {
    name: 'physics',
    description:
      'Physics config. Actions: layers|collision_setup|body_config|set_layer_name. Use help tool for full docs.',
    annotations: {
      title: 'Physics',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
    inputSchema: {
      type: 'object' as const,
      properties: {
        action: {
          type: 'string',
          enum: ['layers', 'collision_setup', 'body_config', 'set_layer_name'],
          description: 'Action to perform',
        },
        project_path: { type: 'string', description: 'Path to Godot project directory' },
        scene_path: { type: 'string', description: 'Path to scene file' },
        name: { type: 'string', description: 'Node name' },
        collision_layer: { type: 'number', description: 'Collision layer bitmask' },
        collision_mask: { type: 'number', description: 'Collision mask bitmask' },
        dimension: { type: 'string', description: '2d or 3d (for set_layer_name)' },
        layer_number: { type: 'number', description: 'Layer number (for set_layer_name)' },
        gravity_scale: { type: 'number', description: 'Gravity scale (for body_config)' },
        mass: { type: 'number', description: 'Mass (for body_config)' },
      },
      required: ['action'],
    },
  },
]

// =============================================
// P3 - Advanced Tools (3)
// =============================================

const P3_TOOLS = [
  {
    name: 'audio',
    description:
      'Audio bus and stream management. Actions: list_buses|add_bus|add_effect|create_stream. Use help tool for full docs.',
    annotations: {
      title: 'Audio',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
    inputSchema: {
      type: 'object' as const,
      properties: {
        action: {
          type: 'string',
          enum: ['list_buses', 'add_bus', 'add_effect', 'create_stream'],
          description: 'Action to perform',
        },
        project_path: { type: 'string', description: 'Path to Godot project directory' },
        scene_path: { type: 'string', description: 'Path to scene file (for create_stream)' },
        bus_name: { type: 'string', description: 'Audio bus name' },
        send_to: { type: 'string', description: 'Send bus target (default: Master)' },
        effect_type: { type: 'string', description: 'Effect type (for add_effect)' },
        name: { type: 'string', description: 'Stream player node name' },
        stream_type: { type: 'string', description: 'Stream type: 2D, 3D, or global' },
        parent: { type: 'string', description: 'Parent node path' },
        bus: { type: 'string', description: 'Audio bus (default: Master)' },
      },
      required: ['action'],
    },
  },
  {
    name: 'navigation',
    description:
      'Navigation regions, agents, obstacles. Actions: create_region|add_agent|add_obstacle. Use help tool for full docs.',
    annotations: {
      title: 'Navigation',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
    inputSchema: {
      type: 'object' as const,
      properties: {
        action: {
          type: 'string',
          enum: ['create_region', 'add_agent', 'add_obstacle'],
          description: 'Action to perform',
        },
        project_path: { type: 'string', description: 'Path to Godot project directory' },
        scene_path: { type: 'string', description: 'Path to scene file' },
        name: { type: 'string', description: 'Node name' },
        parent: { type: 'string', description: 'Parent node path (default: .)' },
        dimension: { type: 'string', description: '2D or 3D (default: 3D)' },
        radius: { type: 'number', description: 'Agent/obstacle radius' },
        max_speed: { type: 'number', description: 'Agent max speed' },
      },
      required: ['action'],
    },
  },
  {
    name: 'ui',
    description:
      'UI Control nodes and themes. Actions: create_control|set_theme|layout|list_controls. Use help tool for full docs.',
    annotations: {
      title: 'UI',
      readOnlyHint: false,
      destructiveHint: false,
      idempotentHint: false,
      openWorldHint: false,
    },
    inputSchema: {
      type: 'object' as const,
      properties: {
        action: {
          type: 'string',
          enum: ['create_control', 'set_theme', 'layout', 'list_controls'],
          description: 'Action to perform',
        },
        project_path: { type: 'string', description: 'Path to Godot project directory' },
        scene_path: { type: 'string', description: 'Path to scene file' },
        name: { type: 'string', description: 'Control node name' },
        type: { type: 'string', description: 'Control type (e.g., Button, Label, HBoxContainer)' },
        parent: { type: 'string', description: 'Parent node path (default: .)' },
        theme_path: { type: 'string', description: 'Path to theme .tres file (for set_theme)' },
        preset: {
          type: 'string',
          description: 'Layout preset: full_rect, center, top_wide, bottom_wide, left_wide, right_wide',
        },
        font_size: { type: 'number', description: 'Default font size (for set_theme)' },
      },
      required: ['action'],
    },
  },
]

const TOOLS = [...P0_TOOLS, ...P1_TOOLS, ...P2_TOOLS, ...P3_TOOLS]

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
