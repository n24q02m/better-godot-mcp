// =============================================
// P2 - Specialized Tools (4)
// =============================================

export const P2_TOOLS = [
  {
    name: 'animation',
    description: 'Animation handling. Actions: create|edit|list_tracks|play. Use help tool for full docs.',
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
          enum: ['create', 'edit', 'list_tracks', 'play'],
          description: 'Action to perform',
        },
        project_path: { type: 'string', description: 'Path to Godot project directory' },
        scene_path: { type: 'string', description: 'Path to scene file' },
        animation_name: { type: 'string', description: 'Animation name' },
        track_path: { type: 'string', description: 'Track path (for edit)' },
        key_time: { type: 'number', description: 'Keyframe time (for edit)' },
        key_value: { type: 'string', description: 'Keyframe value (for edit)' },
      },
      required: ['action'],
    },
  },
  {
    name: 'tilemap',
    description:
      'TileSet/TileMap operations. Actions: create_tileset|add_source|paint|list. Use help tool for full docs.',
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
          enum: ['create_tileset', 'add_source', 'paint', 'list'],
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
