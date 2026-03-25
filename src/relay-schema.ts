/**
 * Config schema for relay page setup.
 *
 * Defines fields for Godot MCP credential collection:
 * - GODOT_PROJECT_PATH (required): path to Godot project directory
 * - GODOT_PATH (optional): path to Godot binary (auto-detected if empty)
 */

import type { RelayConfigSchema } from '@n24q02m/mcp-relay-core/schema'

export const RELAY_SCHEMA: RelayConfigSchema = {
  server: 'better-godot-mcp',
  displayName: 'Godot MCP',
  fields: [
    {
      key: 'project_path',
      label: 'Godot Project Path',
      type: 'text',
      placeholder: '/path/to/project',
      helpText: 'Absolute path to your Godot project directory (containing project.godot)',
      required: true,
    },
  ],
  optional: [
    {
      key: 'godot_path',
      label: 'Godot Binary Path',
      type: 'text',
      placeholder: '/usr/bin/godot4',
      helpText: 'Leave empty for auto-detection. Only set if Godot is not on your PATH.',
    },
  ],
}
