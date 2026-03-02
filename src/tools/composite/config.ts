/**
 * Config tool - Server runtime configuration (Standard Tool Set)
 * Actions: status | set
 */

import { execFileSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { join } from 'node:path'
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

      // Validate path values to prevent command injection or invalid state
      if (key === 'godot_path') {
        try {
          if (!existsSync(value)) {
            throw new Error('File does not exist')
          }
          const output = execFileSync(value, ['--version'], {
            timeout: 5000,
            stdio: ['pipe', 'pipe', 'pipe'],
            encoding: 'utf-8',
          })
          if (!output.includes('Godot Engine')) {
            throw new Error('Not a valid Godot executable')
          }
        } catch (error) {
          throw new GodotMCPError(
            'Invalid Godot path',
            'INVALID_ARGS',
            `The provided path does not appear to be a valid Godot executable: ${error instanceof Error ? error.message : 'Unknown error'}`,
          )
        }
      } else if (key === 'project_path') {
        if (!existsSync(value)) {
          throw new GodotMCPError(
            'Invalid project path',
            'INVALID_ARGS',
            'The provided project directory does not exist.',
          )
        }
        if (!existsSync(join(value, 'project.godot'))) {
          throw new GodotMCPError(
            'Invalid project path',
            'INVALID_ARGS',
            'The provided directory does not contain a project.godot file.',
          )
        }
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
