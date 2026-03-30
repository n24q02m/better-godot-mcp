/**
 * Editor tool - Godot editor management
 * Actions: launch | status
 */

import { launchGodotEditor } from '../../godot/headless.js'
import type { GodotConfig } from '../../godot/types.js'
import { formatJSON, formatSuccess, GodotMCPError, throwUnknownAction } from '../helpers/errors.js'
import { safeResolve } from '../helpers/paths.js'

/**
 * Check if tracked Godot processes are running
 */
function getGodotProcesses(config: GodotConfig): Array<{ pid: string; name: string }> {
  const activeProcesses: Array<{ pid: string; name: string }> = []

  for (const pid of config.activePids) {
    try {
      process.kill(pid, 0)
      activeProcesses.push({ pid: pid.toString(), name: 'godot' })
    } catch {
      // Process not running
    }
  }

  return activeProcesses
}

export async function handleEditor(action: string, args: Record<string, unknown>, config: GodotConfig) {
  switch (action) {
    case 'launch': {
      if (!config.godotPath) {
        throw new GodotMCPError(
          'Godot not found',
          'GODOT_NOT_FOUND',
          'Set GODOT_PATH env var or install Godot. Use config.detect_godot to check.',
        )
      }
      const projectPath = (args.project_path as string) || config.projectPath
      if (!projectPath) {
        throw new GodotMCPError('No project path specified', 'INVALID_ARGS', 'Provide project_path argument.')
      }

      const { pid } = launchGodotEditor(config.godotPath, safeResolve(config.projectPath || process.cwd(), projectPath))
      if (pid) {
        config.activePids.push(pid)
      }
      return formatSuccess(`Godot editor launched (PID: ${pid})`)
    }

    case 'status': {
      const processes = getGodotProcesses(config)
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
