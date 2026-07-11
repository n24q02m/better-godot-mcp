/**
 * CLI subcommands: `detect` and `doctor`
 *
 * Invoked from scripts/start-server.ts when argv[2] matches; reuses the same
 * detection/project-check logic as the `config` composite tool's
 * `detect_godot`/`check` actions, but prints plain stdout/stderr for a CLI
 * rather than an MCP tool response.
 */

import { join, resolve } from 'node:path'
import { detectGodot } from './godot/detector.js'
import { pathExists } from './tools/helpers/paths.js'

async function runDetect(): Promise<number> {
  const result = detectGodot()

  console.log(
    JSON.stringify(
      {
        found: result !== null,
        path: result?.path ?? null,
        version: result?.version ?? null,
        source: result?.source ?? null,
      },
      null,
      2,
    ),
  )

  if (!result) {
    console.error('Godot not found. Set the GODOT_PATH environment variable to your Godot binary.')
    return 1
  }
  return 0
}

async function runDoctor(): Promise<number> {
  const detection = detectGodot()

  if (detection) {
    console.log(`[ok] godot binary: ${detection.path} (source: ${detection.source})`)
    console.log(`[ok] godot version: ${detection.version.raw}`)
  } else {
    console.log('[fail] godot binary: not found')
    console.log('[fail] godot version: unknown (set GODOT_PATH or install Godot)')
  }

  const projectPath = process.env.GODOT_PROJECT_PATH || process.cwd()
  const hasProject = await pathExists(join(projectPath, 'project.godot'))
  if (hasProject) {
    console.log(`[ok] project: ${resolve(projectPath)}`)
  } else {
    console.log(`[warn] project: no project.godot found at ${resolve(projectPath)} (set GODOT_PROJECT_PATH)`)
  }

  // Godot binary is the only hard requirement; a missing/invalid project is a warning.
  return detection ? 0 : 1
}

export async function runGodotCli(cmd: 'detect' | 'doctor'): Promise<number> {
  if (cmd === 'detect') return runDetect()
  return runDoctor()
}
