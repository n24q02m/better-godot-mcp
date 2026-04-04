/**
 * Config tool - Server configuration, environment detection, and verification
 * Actions: status | set | detect_godot | check
 */

import { join } from 'node:path'
import { detectGodot, isExecutable, isVersionSupported, tryGetVersion } from '../../godot/detector.js'
import type { GodotConfig } from '../../godot/types.js'
import { formatJSON, formatSuccess, GodotMCPError, throwUnknownAction } from '../helpers/errors.js'
import { pathExists } from '../helpers/paths.js'

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

      // Validate paths don't contain shell metacharacters
      // Note: backslash (\) is allowed since it's the Windows path separator
      // and we use spawnSync/spawn (not shell exec), so it's not a security risk
      if (
        (key === 'project_path' || key === 'godot_path') &&
        (typeof value !== 'string' || /[;&|`$(){}<>'"\0\n\r]/.test(value))
      ) {
        throw new GodotMCPError(
          `Invalid characters in ${key}`,
          'INVALID_ARGS',
          'Path must not contain shell metacharacters: ; & | ` $ ( ) { } < > \' " \\0 \\n \\r',
        )
      }

      // Validate before updating runtimeConfig to avoid storing invalid values
      if (key === 'project_path') {
        if (!(await pathExists(join(value, 'project.godot')))) {
          throw new GodotMCPError(
            'Invalid project path',
            'INVALID_ARGS',
            `The path '${value}' does not contain a 'project.godot' file.`,
          )
        }
        config.projectPath = value
      } else if (key === 'godot_path') {
        if (!isExecutable(value)) {
          throw new GodotMCPError(
            'Invalid Godot path',
            'INVALID_ARGS',
            `The path '${value}' is not an executable file.`,
          )
        }
        const version = tryGetVersion(value)
        if (!version) {
          throw new GodotMCPError(
            'Invalid Godot binary',
            'INVALID_ARGS',
            `The file at '${value}' is not a valid Godot binary or failed to return version information.`,
          )
        }
        if (!isVersionSupported(version)) {
          throw new GodotMCPError(
            'Unsupported Godot version',
            'INVALID_ARGS',
            `Godot version ${version.raw} is not supported. Minimum required version is 4.1.`,
          )
        }
        config.godotPath = value
        config.godotVersion = version
      }

      // Only persist to runtimeConfig after all validation passes
      runtimeConfig[key] = value

      return formatSuccess(`Config updated: ${key} = ${value}`)
    }

    case 'detect_godot': {
      const result = detectGodot()
      if (!result) {
        return formatJSON({
          found: false,
          message: 'Godot not found on this system',
          suggestions: [
            'Install Godot from https://godotengine.org/download',
            'Set GODOT_PATH environment variable to your Godot binary',
            'Windows: winget install GodotEngine.GodotEngine',
            'macOS: brew install --cask godot',
            'Linux: snap install godot-4 or flatpak install org.godotengine.Godot',
          ],
        })
      }

      return formatJSON({
        found: true,
        path: result.path,
        version: result.version,
        source: result.source,
      })
    }

    case 'check': {
      const detection = detectGodot()
      const projectPath = config.projectPath

      const status = {
        godot: detection ? { found: true, path: detection.path, version: detection.version.raw } : { found: false },
        project: projectPath
          ? {
              path: projectPath,
              // Performance optimization: using async pathExists instead of existsSync
              // to avoid blocking the Node.js event loop during I/O operations
              valid: await pathExists(join(projectPath, 'project.godot')),
            }
          : { path: null },
      }

      return formatJSON(status)
    }

    default:
      throwUnknownAction(action, ['status', 'set', 'detect_godot', 'check'])
  }
}
