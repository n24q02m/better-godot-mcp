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
import { handleShader } from './composite/shader.js'
import { handleSignals } from './composite/signals.js'
import { handleTilemap } from './composite/tilemap.js'
import { handleUI } from './composite/ui.js'
import { findClosestMatch, formatError, GodotMCPError } from './helpers/errors.js'
import { wrapToolResult } from './helpers/security.js'

/**
 * Helper to create standard MCP tool annotations
 */
function createAnnotations(
  title: string,
  options: {
    readOnly?: boolean
    destructive?: boolean
    idempotent?: boolean
  } = {},
) {
  return {
    title,
    readOnlyHint: options.readOnly ?? false,
    destructiveHint: options.destructive ?? false,
    idempotentHint: options.idempotent ?? false,
    openWorldHint: false,
  }
}

/**
 * Common schema property: project_path
 */
const PROJECT_PATH_PROP = { type: 'string', description: 'Path to Godot project directory' } as const

/**
 * Common schema property: scene_path
 */
const SCENE_PATH_PROP = { type: 'string', description: 'Path to scene file (.tscn)' } as const

/**
 * Helper to create a standard action property with enum
 */
const createActionProp = (actions: string[]) => ({
  type: 'string',
  enum: actions,
  description: 'Action to perform',
})

/**
 * Helper to create a standard tool input schema
 */
const createToolSchema = (properties: Record<string, unknown>, required: string[] = ['action']) => ({
  type: 'object' as const,
  properties,
  required,
})

// =============================================
// P0 - Core Tools (7)
// =============================================

const P0_TOOLS = [
  {
    name: 'project',
    description:
      'Godot project operations.\n\nActions (required params -> optional):\n- info (-> project_path): project metadata\n- version: Godot engine version\n- run (-> project_path): launch game\n- stop: stop running game\n- settings_get (key -> project_path): read project setting\n- settings_set (key, value -> project_path): write project setting\n- export (preset, output_path -> project_path): export game build',
    annotations: createAnnotations('Project'),
    inputSchema: createToolSchema({
      action: createActionProp(['info', 'version', 'run', 'stop', 'settings_get', 'settings_set', 'export']),
      project_path: PROJECT_PATH_PROP,
      key: { type: 'string', description: 'Settings key (for settings_get/set)' },
      value: { type: 'string', description: 'Settings value (for settings_set)' },
      preset: { type: 'string', description: 'Export preset name (for export)' },
      output_path: { type: 'string', description: 'Export output path (for export)' },
    }),
  },
  {
    name: 'scenes',
    description:
      'Scene file (.tscn) CRUD.\n\nActions (required params -> optional):\n- create (scene_path -> root_type="Node2D", root_name, project_path)\n- list (-> project_path)\n- info (scene_path -> project_path)\n- delete (scene_path -> project_path)\n- duplicate (scene_path, new_path -> project_path)\n- set_main (scene_path -> project_path)\n\nscene_path: relative to project root (e.g., "scenes/main.tscn"), NOT res:// prefix. Use nodes tool to edit nodes within a scene.',
    annotations: createAnnotations('Scenes', { destructive: true }),
    inputSchema: createToolSchema({
      action: createActionProp(['create', 'list', 'info', 'delete', 'duplicate', 'set_main']),
      project_path: PROJECT_PATH_PROP,
      scene_path: {
        type: 'string',
        description: 'Relative scene file path from project root (e.g., "scenes/main.tscn"), not res:// prefix',
      },
      root_type: { type: 'string', description: 'Root node type for create (default: Node2D)' },
      root_name: { type: 'string', description: 'Root node name for create' },
      new_path: { type: 'string', description: 'Destination path (for duplicate)' },
    }),
  },
  {
    name: 'nodes',
    description:
      'Scene node operations.\n\nActions (required params -> optional):\n- add (scene_path, name -> type="Node", parent=".", project_path)\n- remove (scene_path, name -> project_path)\n- rename (scene_path, name, new_name -> project_path)\n- list (scene_path -> project_path)\n- set_property (scene_path, name, property, value -> project_path)\n- get_property (scene_path, name, property -> project_path)\n\nNode paths: relative to scene root using "/" (e.g., "Player/Sprite2D"). Use "." for root.',
    annotations: createAnnotations('Nodes', { destructive: true }),
    inputSchema: createToolSchema({
      action: createActionProp(['add', 'remove', 'rename', 'list', 'set_property', 'get_property']),
      project_path: PROJECT_PATH_PROP,
      scene_path: SCENE_PATH_PROP,
      name: { type: 'string', description: 'Node name' },
      type: { type: 'string', description: 'Node type (for add, default: Node)' },
      parent: {
        type: 'string',
        description:
          'Parent node path relative to scene root (for add, default: "." = root). Use "/" separator, e.g., "Player/Sprite2D"',
      },
      new_name: { type: 'string', description: 'New name (for rename)' },
      property: { type: 'string', description: 'Property name (for get/set_property)' },
      value: { type: 'string', description: 'Property value (for set_property)' },
    }),
  },
  {
    name: 'scripts',
    description:
      'GDScript file CRUD.\n\nActions (required params -> optional):\n- create (script_path -> extends="Node", content, project_path): generate template\n- read (script_path -> project_path)\n- write (script_path, content -> project_path): replace entire file\n- attach (script_path, scene_path, node_name -> project_path): link to scene node\n- list (-> project_path)\n- delete (script_path -> project_path)\n\nscript_path: relative to project root (e.g., "scripts/player.gd").',
    annotations: createAnnotations('Scripts', { destructive: true }),
    inputSchema: createToolSchema({
      action: createActionProp(['create', 'read', 'write', 'attach', 'list', 'delete']),
      project_path: PROJECT_PATH_PROP,
      script_path: { type: 'string', description: 'Path to GDScript file' },
      extends: { type: 'string', description: 'Base class for create (default: Node)' },
      content: { type: 'string', description: 'Script content (for create/write)' },
      scene_path: SCENE_PATH_PROP,
      node_name: { type: 'string', description: 'Target node name (for attach)' },
    }),
  },
  {
    name: 'editor',
    description:
      'Godot editor control.\n\nActions (required params -> optional):\n- launch (-> project_path): open editor\n- status (-> project_path): check if editor is running\n\nFor running the game, use project(action="run") instead.',
    annotations: createAnnotations('Editor', { idempotent: true }),
    inputSchema: createToolSchema({
      action: createActionProp(['launch', 'status']),
      project_path: PROJECT_PATH_PROP,
    }),
  },
  {
    name: 'config',
    description:
      'Server configuration and environment.\n\nActions (required params -> optional):\n- status: current config\n- set (key, value): update setting\n- detect_godot: find Godot binary path\n- check: verify project and Godot availability',
    annotations: createAnnotations('Config', { idempotent: true }),
    inputSchema: createToolSchema({
      action: createActionProp(['status', 'set', 'detect_godot', 'check']),
      key: { type: 'string', description: 'Config key (for set)' },
      value: { type: 'string', description: 'Config value (for set)' },
    }),
  },
  {
    name: 'help',
    description: 'Full documentation for a tool. Use when compressed descriptions are insufficient.',
    annotations: createAnnotations('Help', { readOnly: true, idempotent: true }),
    inputSchema: createToolSchema(
      {
        tool_name: {
          type: 'string',
          enum: [
            'project',
            'scenes',
            'nodes',
            'scripts',
            'editor',
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
      ['tool_name'],
    ),
  },
]

// =============================================
// P1 - Extended Tools (3)
// =============================================

const P1_TOOLS = [
  {
    name: 'resources',
    description:
      'Resource file management.\n\nActions (required params -> optional):\n- list (-> type, project_path): browse resources (type: image|audio|font|shader|scene|resource)\n- info (resource_path -> project_path): resource metadata\n- delete (resource_path -> project_path)\n- import_config (resource_path -> project_path): view import settings',
    annotations: createAnnotations('Resources', { destructive: true }),
    inputSchema: createToolSchema({
      action: createActionProp(['list', 'info', 'delete', 'import_config']),
      project_path: PROJECT_PATH_PROP,
      resource_path: { type: 'string', description: 'Path to resource file' },
      type: { type: 'string', description: 'Filter by type: image, audio, font, shader, scene, resource (for list)' },
    }),
  },
  {
    name: 'input_map',
    description:
      'Input action management.\n\nActions (required params -> optional):\n- list (-> project_path): all input actions\n- add_action (action_name -> deadzone=0.5, project_path)\n- remove_action (action_name -> project_path)\n- add_event (action_name, event_type, event_value -> project_path)\n\nevent_type: key | mouse | joypad. event_value: e.g., KEY_SPACE.',
    annotations: createAnnotations('Input Map', { destructive: true }),
    inputSchema: createToolSchema({
      action: createActionProp(['list', 'add_action', 'remove_action', 'add_event']),
      project_path: PROJECT_PATH_PROP,
      action_name: { type: 'string', description: 'Input action name' },
      deadzone: { type: 'number', description: 'Deadzone value (for add_action, default: 0.5)' },
      event_type: { type: 'string', description: 'Event type: key, mouse, joypad (for add_event)' },
      event_value: { type: 'string', description: 'Event value, e.g., KEY_SPACE (for add_event)' },
    }),
  },
  {
    name: 'signals',
    description:
      'Signal connection management.\n\nActions (required params -> optional):\n- list (scene_path -> project_path): all signal connections\n- connect (scene_path, signal, from, to, method -> flags, project_path)\n- disconnect (scene_path, signal, from, to, method -> project_path)',
    annotations: createAnnotations('Signals', { destructive: true }),
    inputSchema: createToolSchema({
      action: createActionProp(['list', 'connect', 'disconnect']),
      project_path: PROJECT_PATH_PROP,
      scene_path: SCENE_PATH_PROP,
      signal: { type: 'string', description: 'Signal name' },
      from: { type: 'string', description: 'Source node path' },
      to: { type: 'string', description: 'Target node path' },
      method: { type: 'string', description: 'Target method name' },
      flags: { type: 'number', description: 'Connection flags' },
    }),
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
    annotations: createAnnotations('Animation'),
    inputSchema: createToolSchema({
      action: createActionProp(['create_player', 'add_animation', 'add_track', 'add_keyframe', 'list']),
      project_path: PROJECT_PATH_PROP,
      scene_path: SCENE_PATH_PROP,
      name: { type: 'string', description: 'AnimationPlayer node name' },
      parent: { type: 'string', description: 'Parent node path' },
      anim_name: { type: 'string', description: 'Animation name' },
      duration: { type: 'number', description: 'Animation duration in seconds' },
      loop: { type: 'boolean', description: 'Whether animation loops' },
      track_type: { type: 'string', description: 'Track type: value, method, bezier' },
      node_path: { type: 'string', description: 'Target node path for track' },
      property: { type: 'string', description: 'Target property for track' },
    }),
  },
  {
    name: 'tilemap',
    description:
      'TileSet and TileMap management. Actions: create_tileset|add_source|set_tile|paint|list. Use help tool for full docs.',
    annotations: createAnnotations('TileMap'),
    inputSchema: createToolSchema({
      action: createActionProp(['create_tileset', 'add_source', 'set_tile', 'paint', 'list']),
      project_path: PROJECT_PATH_PROP,
      scene_path: SCENE_PATH_PROP,
      tileset_path: { type: 'string', description: 'Path to TileSet .tres file (for create_tileset, add_source)' },
      texture_path: { type: 'string', description: 'Texture source path (for add_source)' },
      tile_size: { type: 'number', description: 'Tile size in pixels (default: 16, for create_tileset)' },
    }),
  },
  {
    name: 'shader',
    description: 'Godot shader management. Actions: create|read|write|get_params|list. Use help tool for full docs.',
    annotations: createAnnotations('Shader'),
    inputSchema: createToolSchema({
      action: createActionProp(['create', 'read', 'write', 'get_params', 'list']),
      project_path: PROJECT_PATH_PROP,
      shader_path: { type: 'string', description: 'Path to .gdshader file' },
      shader_type: {
        type: 'string',
        description: 'Shader type: canvas_item, spatial, particles, sky, fog (for create)',
      },
      content: { type: 'string', description: 'Shader content (for create/write)' },
    }),
  },
  {
    name: 'physics',
    description:
      'Physics config. Actions: layers|collision_setup|body_config|set_layer_name. Use help tool for full docs.',
    annotations: createAnnotations('Physics'),
    inputSchema: createToolSchema({
      action: createActionProp(['layers', 'collision_setup', 'body_config', 'set_layer_name']),
      project_path: PROJECT_PATH_PROP,
      scene_path: SCENE_PATH_PROP,
      name: { type: 'string', description: 'Node name' },
      collision_layer: { type: 'number', description: 'Collision layer bitmask' },
      collision_mask: { type: 'number', description: 'Collision mask bitmask' },
      dimension: { type: 'string', description: '2d or 3d (for set_layer_name)' },
      layer_number: { type: 'number', description: 'Layer number (for set_layer_name)' },
      gravity_scale: { type: 'number', description: 'Gravity scale (for body_config)' },
      mass: { type: 'number', description: 'Mass (for body_config)' },
    }),
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
    annotations: createAnnotations('Audio'),
    inputSchema: createToolSchema({
      action: createActionProp(['list_buses', 'add_bus', 'add_effect', 'create_stream']),
      project_path: PROJECT_PATH_PROP,
      scene_path: SCENE_PATH_PROP,
      bus_name: { type: 'string', description: 'Audio bus name' },
      send_to: { type: 'string', description: 'Send bus target (default: Master)' },
      effect_type: { type: 'string', description: 'Effect type (for add_effect)' },
      name: { type: 'string', description: 'Stream player node name' },
      stream_type: { type: 'string', description: 'Stream type: 2D, 3D, or global' },
      parent: { type: 'string', description: 'Parent node path' },
      bus: { type: 'string', description: 'Audio bus (default: Master)' },
    }),
  },
  {
    name: 'navigation',
    description:
      'Navigation regions, agents, obstacles. Actions: create_region|add_agent|add_obstacle. Use help tool for full docs.',
    annotations: createAnnotations('Navigation'),
    inputSchema: createToolSchema({
      action: createActionProp(['create_region', 'add_agent', 'add_obstacle']),
      project_path: PROJECT_PATH_PROP,
      scene_path: SCENE_PATH_PROP,
      name: { type: 'string', description: 'Node name' },
      parent: { type: 'string', description: 'Parent node path (default: .)' },
      dimension: { type: 'string', description: '2D or 3D (default: 3D)' },
      radius: { type: 'number', description: 'Agent/obstacle radius' },
      max_speed: { type: 'number', description: 'Agent max speed' },
    }),
  },
  {
    name: 'ui',
    description:
      'UI Control nodes and themes. Actions: create_control|set_theme|layout|list_controls. Use help tool for full docs.',
    annotations: createAnnotations('UI'),
    inputSchema: createToolSchema({
      action: createActionProp(['create_control', 'set_theme', 'layout', 'list_controls']),
      project_path: PROJECT_PATH_PROP,
      scene_path: SCENE_PATH_PROP,
      name: { type: 'string', description: 'Control node name' },
      type: { type: 'string', description: 'Control type (e.g., Button, Label, HBoxContainer)' },
      parent: { type: 'string', description: 'Parent node path (default: .)' },
      theme_path: { type: 'string', description: 'Path to theme .tres file (for set_theme)' },
      preset: {
        type: 'string',
        description: 'Layout preset: full_rect, center, top_wide, bottom_wide, left_wide, right_wide',
      },
      font_size: { type: 'number', description: 'Default font size (for set_theme)' },
    }),
  },
]

const TOOLS = [...P0_TOOLS, ...P1_TOOLS, ...P2_TOOLS, ...P3_TOOLS]

type ToolHandler = (
  action: string,
  args: Record<string, unknown>,
  config: GodotConfig,
) => Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }>

const TOOL_HANDLERS: Record<string, ToolHandler> = {
  project: handleProject,
  scenes: handleScenes,
  nodes: handleNodes,
  scripts: handleScripts,
  editor: handleEditor,
  config: handleConfig,
  resources: handleResources,
  input_map: handleInputMap,
  signals: handleSignals,
  animation: handleAnimation,
  tilemap: handleTilemap,
  shader: handleShader,
  physics: handlePhysics,
  audio: handleAudio,
  navigation: handleNavigation,
  ui: handleUI,
}

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
      let result: { content: Array<{ type: string; text: string }>; isError?: boolean }
      if (name === 'help') {
        result = await handleHelp(
          (args.action as string) || (args.tool_name as string),
          args as Record<string, unknown>,
        )
      } else {
        const handler = TOOL_HANDLERS[name]
        if (!handler) {
          const validTools = TOOLS.map((t) => t.name)
          const closest = findClosestMatch(name, validTools)
          const suggestion = closest ? ` Did you mean '${closest}'?` : ''
          throw new GodotMCPError(
            `Unknown tool: ${name}.${suggestion}`,
            'INVALID_ACTION',
            `Available tools: ${validTools.join(', ')}`,
          )
        }
        result = await handler(args.action as string, args as Record<string, unknown>, config)
      }
      return wrapToolResult(name, result)
    } catch (error) {
      return formatError(error)
    }
  })
}
