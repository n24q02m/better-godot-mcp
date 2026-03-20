/**
 * Setup tool - Environment detection and verification
 * Actions: detect_godot | check
 */

import { join } from 'node:path'
import { detectGodot } from '../../godot/detector.js'
import type { GodotConfig } from '../../godot/types.js'
import { formatJSON, throwUnknownAction } from '../helpers/errors.js'
import { pathExists } from '../helpers/paths.js'

export async function handleSetup(action: string, _args: Record<string, unknown>, config: GodotConfig) {
  switch (action) {
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
      throwUnknownAction(action, ['detect_godot', 'check'])
  }
}
