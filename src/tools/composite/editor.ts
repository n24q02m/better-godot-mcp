/**
 * Editor tool - Godot editor management
 * Actions: launch | status
 */

import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { launchGodotEditor } from '../../godot/headless.js'
import type { GodotConfig } from '../../godot/types.js'
import { formatJSON, formatSuccess, GodotMCPError, throwUnknownAction } from '../helpers/errors.js'
import { safeResolve } from '../helpers/paths.js'

const execFileAsync = promisify(execFile)

/**
 * Check if all Godot processes are running
 */
async function getGodotProcessesAsync(): Promise<Array<{ pid: string; name: string }>> {
  try {
    if (process.platform === 'win32') {
      const { stdout } = await execFileAsync('tasklist', ['/FI', 'IMAGENAME eq godot*', '/FO', 'CSV', '/NH'], {
        encoding: 'utf-8',
      })
      return stdout
        .split('\n')
        .filter((line) => line.includes('godot'))
        .map((line) => {
          const parts = line.split(',').map((p) => p.replace(/"/g, '').trim())
          const pidMatch = parts[1]?.match(/^\d+$/)
          if (!pidMatch) return null

          const name = parts[0] ? parts[0].replace(/[^\w.-]/g, '_') : 'godot'
          return { pid: pidMatch[0], name }
        })
        .filter((item): item is { pid: string; name: string } => item !== null)
    }

    const { stdout } = await execFileAsync('pgrep', ['-la', 'godot'], {
      encoding: 'utf-8',
    })
    return stdout
      .split('\n')
      .filter(Boolean)
      .map((line) => {
        const parts = line.trim().split(/\s+/)
        const pidMatch = parts[0]?.match(/^\d+$/)
        if (!pidMatch) return null

        const fullCmd = parts.slice(1).join(' ')
        // Extract basic process name without path or arguments, sanitize to safe characters
        const baseNameMatch = fullCmd.match(/([^/\\]+?)(?:\s|$)/)
        const name = baseNameMatch ? baseNameMatch[1].replace(/[^\w.-]/g, '_') : 'godot'

        return { pid: pidMatch[0], name }
      })
      .filter((item): item is { pid: string; name: string } => item !== null)
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

      const { pid } = launchGodotEditor(config.godotPath, safeResolve(config.projectPath || process.cwd(), projectPath))
      return formatSuccess(`Godot editor launched (PID: ${pid})`)
    }

    case 'status': {
      const processes = await getGodotProcessesAsync()
      return formatJSON({
        running: processes.length > 0,
        processes,
        godotPath: config.godotPath || 'not detected',
      })
    }

    default:
      throwUnknownAction(action, ['launch', 'status'])
  }
}
