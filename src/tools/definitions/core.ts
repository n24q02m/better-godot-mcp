// =============================================
// P0 - Core Tools (8)
// =============================================

export const P0_TOOLS = [
  {
    name: 'project',
    description:
      'Manage Godot project structure and files. Actions: list|create_script|create_scene|read. Use help tool for full docs.',
    annotations: {
      title: 'Project',
      readOnlyHint: false,
      destructiveHint: false, // Reading/Listing is safe, create is not. But mega-tools take worst case?
      // Wait, let's keep original annotations
      idempotentHint: false,
      openWorldHint: false,
    },
    inputSchema: {
      type: 'object' as const,
      properties: {
        action: {
          type: 'string',
          enum: ['list', 'create_script', 'create_scene', 'read'],
          description: 'Action to perform',
        },
        project_path: { type: 'string', description: 'Path to Godot project directory' },
        path: { type: 'string', description: 'File or directory path (relative to project)' },
        content: { type: 'string', description: 'Content for create actions' },
        depth: { type: 'number', description: 'Depth for list action (default: 1)' },
      },
      required: ['action'],
    },
  },
  {
    name: 'scenes',
    description:
      'Scene manipulation and inspection. Actions: list_tree|instantiate|attach_script|get_tree. Use help tool for full docs.',
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
          enum: ['list_tree', 'instantiate', 'attach_script', 'get_tree'],
          description: 'Action to perform',
        },
        project_path: { type: 'string', description: 'Path to Godot project directory' },
        scene_path: { type: 'string', description: 'Path to scene file' },
        node_path: { type: 'string', description: 'Path to node within scene' },
        parent_path: { type: 'string', description: 'Parent node path for instantiation' },
        script_path: { type: 'string', description: 'Path to script to attach' },
      },
      required: ['action'],
    },
  },
  {
    name: 'nodes',
    description:
      'Node manipulation. Actions: add|remove|set_prop|get_prop|list_props|reparent|connect. Use help tool for full docs.',
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
          enum: ['add', 'remove', 'set_prop', 'get_prop', 'list_props', 'reparent', 'connect'],
          description: 'Action to perform',
        },
        project_path: { type: 'string', description: 'Path to Godot project directory' },
        scene_path: { type: 'string', description: 'Path to scene file' },
        node_path: { type: 'string', description: 'Path to node' },
        node_type: { type: 'string', description: 'Type of node to add' },
        name: { type: 'string', description: 'Name for new node' },
        parent_path: { type: 'string', description: 'Parent path for add/reparent' },
        property: { type: 'string', description: 'Property name' },
        value: { type: 'string', description: 'Property value (JSON stringified if complex)' },
        target: { type: 'string', description: 'Target node for signal connection' },
        signal: { type: 'string', description: 'Signal name' },
        method: { type: 'string', description: 'Method name' },
      },
      required: ['action'],
    },
  },
  {
    name: 'scripts',
    description:
      'GDScript analysis and modification. Actions: parse|extends|functions|signals. Use help tool for full docs.',
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
          enum: ['parse', 'extends', 'functions', 'signals'],
          description: 'Action to perform',
        },
        project_path: { type: 'string', description: 'Path to Godot project directory' },
        script_path: { type: 'string', description: 'Path to script file' },
        content: { type: 'string', description: 'Script content (optional, for parse)' },
      },
      required: ['action'],
    },
  },
  {
    name: 'editor',
    description: 'Editor command integration. Actions: command|open|reload. Use help tool for full docs.',
    annotations: {
      title: 'Editor',
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
          enum: ['command', 'open', 'reload'],
          description: 'Action to perform',
        },
        command: { type: 'string', description: 'Editor command to execute' },
        file: { type: 'string', description: 'File to open' },
      },
      required: ['action'],
    },
  },
  {
    name: 'setup',
    description: 'Environment verification. Actions: check|verify_godot. Use help tool for full docs.',
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
        action: {
          type: 'string',
          enum: ['check', 'verify_godot'],
          description: 'Action to perform',
        },
        project_path: { type: 'string', description: 'Path to Godot project directory' },
      },
      required: ['action'],
    },
  },
  {
    name: 'config',
    description:
      'Project settings management. Actions: get|set|list|get_all|create_override. Use help tool for full docs.',
    annotations: {
      title: 'Config',
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
          enum: ['get', 'set', 'list', 'get_all', 'create_override'],
          description: 'Action to perform',
        },
        project_path: { type: 'string', description: 'Path to Godot project directory' },
        section: { type: 'string', description: 'Config section' },
        key: { type: 'string', description: 'Config key' },
        value: { type: 'string', description: 'Config value' },
      },
      required: ['action'],
    },
  },
  {
    name: 'help',
    description: 'Get documentation for tools. Pass tool_name to see available actions and examples.',
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
          description: 'Tool name to get help for',
        },
      },
      required: ['tool_name'],
    },
  },
]
