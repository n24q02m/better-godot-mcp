/**
 * Editor tool - Godot editor management
 * Actions: launch | status
 */

import { type ExecOptions, exec } from 'node:child_process'
import { resolve } from 'node:path'
import { launchGodotEditor } from '../../godot/headless.js'
import type { GodotConfig } from '../../godot/types.js'
import { formatJSON, formatSuccess, GodotMCPError } from '../helpers/errors.js'

/**
 * Promisified exec
 */
function execAsync(command: string, options: ExecOptions): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    exec(command, options, (error, stdout, stderr) => {
      if (error) {
        reject(error)
      } else {
        resolve({ stdout: stdout as string, stderr: stderr as string })
      }
    })
  })
}

/**
 * Check if any Godot processes are running
 */
async function getGodotProcesses(): Promise<Array<{ pid: string; name: string }>> {
  try {
    if (process.platform === 'win32') {
      const { stdout } = await execAsync('tasklist /FI "IMAGENAME eq godot*" /FO CSV /NH', {
        encoding: 'utf-8',
      })
      return stdout
        .split('\n')
        .filter((line) => line.includes('godot'))
        .map((line) => {
          const parts = line.split(',').map((p) => p.replace(/"/g, '').trim())
          return { pid: parts[1] || 'unknown', name: parts[0] || 'godot' }
        })
    }

    const { stdout } = await execAsync('pgrep -la godot', {
      encoding: 'utf-8',
    })
    return stdout
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const parts = line.trim().split(/\s+/)
        return { pid: parts[0], name: parts.slice(1).join(' ') }
      })
  } catch {
    return []
  }
}

export async function handleEditor(action: string, args: Record<string, unknown>, config: GodotConfig) {
  switch (action) {
    case 'launch': {
      if (!config.godotPath) {
        throw new GodotMCPError(
          'Godot not found',
          'GODOT_NOT_FOUND',
          'Set GODOT_PATH env var or install Godot. Use setup.detect_godot to check.',
        )
      }
      const projectPath = (args.project_path as string) || config.projectPath
      if (!projectPath) {
        throw new GodotMCPError('No project path specified', 'INVALID_ARGS', 'Provide project_path argument.')
      }

      const { pid } = launchGodotEditor(config.godotPath, resolve(projectPath))
      return formatSuccess(`Godot editor launched (PID: ${pid})`)
    }

    case 'status': {
      const processes = await getGodotProcesses()
      return formatJSON({
        running: processes.length > 0,
        processes,
        godotPath: config.godotPath || 'not detected',
      })
    }

    default:
      throw new GodotMCPError(
        `Unknown action: ${action}`,
        'INVALID_ACTION',
        'Valid actions: launch, status. Use help tool for full docs.',
      )
  }
}
