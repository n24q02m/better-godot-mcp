/**
 * Setup tool - Environment detection and verification
 * Actions: detect_godot | check
 */

import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { detectGodot } from '../../godot/detector.js'
import type { GodotConfig } from '../../godot/types.js'
import { formatJSON, GodotMCPError } from '../helpers/errors.js'

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
              valid: existsSync(join(projectPath, 'project.godot')),
            }
          : { path: null },
      }

      return formatJSON(status)
    }

    default:
      throw new GodotMCPError(
        `Unknown action: ${action}`,
        'INVALID_ACTION',
        'Valid actions: detect_godot, check. Use help tool for full docs.',
      )
  }
}
