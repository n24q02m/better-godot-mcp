// =============================================
// P3 - Advanced Tools (3)
// =============================================

export const P3_TOOLS = [
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
