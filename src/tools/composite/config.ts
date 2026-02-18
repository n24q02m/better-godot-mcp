/**
 * Config tool - Server runtime configuration (Standard Tool Set)
 * Actions: status | set
 */

import type { GodotConfig } from '../../godot/types.js'
import { formatJSON, formatSuccess, GodotMCPError } from '../helpers/errors.js'

// Mutable runtime config
const runtimeConfig: Record<string, string> = {}

export async function handleConfig(action: string, args: Record<string, unknown>, config: GodotConfig) {
  switch (action) {
    case 'status': {
      return formatJSON({
        godot_path: config.godotPath || 'not detected',
        godot_version: config.godotVersion?.raw || 'unknown',
        project_path: config.projectPath || 'not set',
        runtime_overrides: runtimeConfig,
      })
    }

    case 'set': {
      const key = args.key as string
      const value = args.value as string

      if (!key) {
        throw new GodotMCPError('No key specified', 'INVALID_ARGS', 'Provide key to set (e.g., project_path).')
      }
      if (value === undefined || value === null) {
        throw new GodotMCPError('No value specified', 'INVALID_ARGS', 'Provide value for the key.')
      }

      const validKeys = ['project_path', 'godot_path', 'timeout']
      if (!validKeys.includes(key)) {
        throw new GodotMCPError(`Invalid config key: ${key}`, 'INVALID_ARGS', `Valid keys: ${validKeys.join(', ')}`)
      }

      runtimeConfig[key] = value

      // Apply to active config
      if (key === 'project_path') {
        config.projectPath = value
      } else if (key === 'godot_path') {
        config.godotPath = value
      }

      return formatSuccess(`Config updated: ${key} = ${value}`)
    }

    default:
      throw new GodotMCPError(
        `Unknown action: ${action}`,
        'INVALID_ACTION',
        'Valid actions: status, set. Use help tool for full docs.',
      )
  }
}
