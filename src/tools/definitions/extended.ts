// =============================================
// P1 - Extended Tools (3)
// =============================================

export const P1_TOOLS = [
  {
    name: 'resources',
    description: 'Resource management. Actions: load|save|inspect|create. Use help tool for full docs.',
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
        action: {
          type: 'string',
          enum: ['load', 'save', 'inspect', 'create'],
          description: 'Action to perform',
        },
        project_path: { type: 'string', description: 'Path to Godot project directory' },
        resource_path: { type: 'string', description: 'Path to resource file' },
        type: { type: 'string', description: 'Resource type (for create)' },
        content: { type: 'string', description: 'Resource content (optional, for create/save)' },
      },
      required: ['action'],
    },
  },
  {
    name: 'input_map',
    description: 'Input mapping configuration. Actions: add|remove|list|get_action. Use help tool for full docs.',
    annotations: {
      title: 'InputMap',
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
          enum: ['add', 'remove', 'list', 'get_action'],
          description: 'Action to perform',
        },
        project_path: { type: 'string', description: 'Path to Godot project directory' },
        action_name: { type: 'string', description: 'Input action name' },
        event: { type: 'string', description: 'Input event description (e.g. key:Space, joy:0)' },
      },
      required: ['action'],
    },
  },
  {
    name: 'signals',
    description: 'Signal management. Actions: list|connect|disconnect|emit. Use help tool for full docs.',
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
        action: {
          type: 'string',
          enum: ['list', 'connect', 'disconnect', 'emit'],
          description: 'Action to perform',
        },
        project_path: { type: 'string', description: 'Path to Godot project directory' },
        scene_path: { type: 'string', description: 'Path to scene file' },
        node_path: { type: 'string', description: 'Path to node' },
        signal: { type: 'string', description: 'Signal name' },
        target: { type: 'string', description: 'Target node' },
        method: { type: 'string', description: 'Target method' },
      },
      required: ['action'],
    },
  },
]
