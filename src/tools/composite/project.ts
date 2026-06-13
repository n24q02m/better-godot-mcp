/**
 * Project tool - Godot project management
 * Actions: info | version | run | stop | settings_get | settings_set | export
 */

import { execFileSync } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import { execGodotAsync, runGodotProject } from '../../godot/headless.js'
import type { GodotConfig, ProjectInfo } from '../../godot/types.js'
import { formatJSON, formatSuccess, GodotMCPError, throwUnknownAction } from '../helpers/errors.js'
import { safeResolve } from '../helpers/paths.js'
import {
  getSetting,
  type ProjectSettings,
  parseProjectSettingsAsync,
  setSettingInContent,
} from '../helpers/project-settings.js'
import { isValidPid, validateNoNewlines, validatePid } from '../helpers/security.js'
import { parseCommaSeparatedList } from '../helpers/strings.js'

async function parseProjectGodot(projectPath: string): Promise<ProjectInfo> {
  const configPath = join(projectPath, 'project.godot')

  let content: string
  try {
    content = await readFile(configPath, 'utf-8')
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new GodotMCPError(
        `No project.godot found at ${projectPath}`,
        'PROJECT_NOT_FOUND',
        'Verify the project path contains a valid Godot project.',
      )
    }
    throw err
  }
  const info: ProjectInfo = { name: 'Unknown', configVersion: 5, mainScene: null, features: [], settings: {} }
  let currentSection = ''

  let pos = 0
  const len = content.length

  while (pos < len) {
    let nextNewline = content.indexOf('\n', pos)
    if (nextNewline === -1) nextNewline = len

    // manual trim
    let start = pos
    let end = nextNewline
    while (start < end && content.charCodeAt(start) <= 32) start++
    while (end > start && content.charCodeAt(end - 1) <= 32) end--

    if (start < end) {
      const trimmed = content.slice(start, end)
      const firstChar = trimmed.charCodeAt(0)
      const lastChar = trimmed.charCodeAt(trimmed.length - 1)

      // Section header
      if (firstChar === 91 && lastChar === 93) {
        // '[' and ']'
        currentSection = trimmed.slice(1, -1)
      } else {
        // Key-value pair
        const eqIdx = trimmed.indexOf('=')
        if (eqIdx !== -1) {
          // ⚡ Bolt: Direct string slice and length checks replace expensive RegExp compilation and matching
          const key = trimmed.slice(0, eqIdx).trimEnd()
          const rawValue = trimmed.slice(eqIdx + 1).trimStart()

          const value =
            rawValue.length >= 2 && rawValue.charCodeAt(0) === 34 && rawValue.charCodeAt(rawValue.length - 1) === 34
              ? rawValue.slice(1, -1)
              : rawValue

          if (currentSection === '' || currentSection === 'application') {
            if (key === 'config/name') info.name = value
            if (key === 'run/main_scene') info.mainScene = value
            if (key === 'config/features') {
              const featMatch = rawValue.match(/PackedStringArray\((.+)\)/)
              if (featMatch) {
                info.features = parseCommaSeparatedList(featMatch[1])
              }
            }
          }

          if (key === 'config_version') info.configVersion = Number.parseInt(value, 10)
          info.settings[`${currentSection ? `${currentSection}/` : ''}${key}`] = value
        }
      }
    }

    pos = nextNewline === -1 ? len : nextNewline + 1
  }

  return info
}

/**
 * Resolves and validates the project path from arguments or config.
 */
function getResolvedProjectPath(args: Record<string, unknown>, config: GodotConfig): string {
  const projectPath = (args.project_path as string) || config.projectPath
  if (!projectPath) {
    throw new GodotMCPError(
      'No project path specified',
      'INVALID_ARGS',
      'Provide project_path argument or set it via config.set action.',
    )
  }
  if (typeof args.project_path === 'string' && args.project_path.startsWith('-')) {
    throw new GodotMCPError('Invalid project path', 'INVALID_ARGS', 'Project path must not start with a hyphen.')
  }
  return safeResolve(config.projectPath || process.cwd(), projectPath)
}

async function handleProjectInfo(_action: string, args: Record<string, unknown>, config: GodotConfig) {
  const resolvedPath = getResolvedProjectPath(args, config)
  const info = await parseProjectGodot(resolvedPath)
  return formatJSON(info)
}

async function handleProjectVersion(_action: string, _args: Record<string, unknown>, config: GodotConfig) {
  if (!config.godotPath) {
    throw new GodotMCPError('Godot not found', 'GODOT_NOT_FOUND', 'Set GODOT_PATH env var or install Godot.')
  }
  const result = await execGodotAsync(config.godotPath, ['--version'])
  return formatSuccess(`Godot version: ${result.stdout}`)
}

async function handleProjectRun(_action: string, args: Record<string, unknown>, config: GodotConfig) {
  if (!config.godotPath)
    throw new GodotMCPError('Godot not found', 'GODOT_NOT_FOUND', 'Set GODOT_PATH env var or install Godot.')

  const resolvedPath = getResolvedProjectPath(args, config)

  const scenePath = args.scene_path as string
  if (scenePath !== undefined && typeof scenePath !== 'string') {
    throw new GodotMCPError('Invalid scene path', 'INVALID_ARGS', 'Scene path must be a string.')
  }
  validateNoNewlines('Invalid scene path', scenePath)
  if (scenePath?.startsWith('-')) {
    throw new GodotMCPError('Invalid scene path', 'INVALID_ARGS', 'Scene path must not start with a hyphen.')
  }

  const { pid } = runGodotProject(config.godotPath, resolvedPath, scenePath)
  if (pid) {
    validatePid(pid)
    config.activePids.push(pid)
  }
  return formatSuccess(`Godot project started (PID: ${pid})${scenePath ? ` for scene ${scenePath}` : ''}`)
}

async function handleProjectStop(_action: string, _args: Record<string, unknown>, config: GodotConfig) {
  if (config.activePids.length === 0) {
    return formatSuccess('No running Godot processes found (tracked by this server)')
  }

  let stoppedCount = 0
  for (const pid of config.activePids) {
    // Security: strictly validate pid is a positive safe integer before using in shell commands or process.kill
    if (!isValidPid(pid)) {
      continue
    }

    try {
      if (process.platform === 'win32') {
        // Check if process exists before attempting to kill
        try {
          process.kill(pid, 0)
          execFileSync('taskkill', ['/F', '/PID', pid.toString(), '/T'], { stdio: 'pipe' })
        } catch {
          // Process already dead
          continue
        }
      } else {
        process.kill(pid, 'SIGTERM')
      }
      stoppedCount++
    } catch {
      // Process might have already terminated
    }
  }

  config.activePids = []
  return formatSuccess(`Godot processes stopped (Stopped ${stoppedCount} tracked processes)`)
}

async function handleProjectSettingsGet(_action: string, args: Record<string, unknown>, config: GodotConfig) {
  const resolvedPath = getResolvedProjectPath(args, config)
  const key = args.key as string
  if (!key)
    throw new GodotMCPError('No key specified', 'INVALID_ARGS', 'Provide key (e.g., "application/config/name").')

  const configPath = join(resolvedPath, 'project.godot')

  let settings: ProjectSettings
  try {
    settings = await parseProjectSettingsAsync(configPath)
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new GodotMCPError('No project.godot found', 'PROJECT_NOT_FOUND', 'Verify the project path.')
    }
    throw err
  }
  const value = getSetting(settings, key)

  return formatJSON({ key, value: value ?? null })
}

async function handleProjectSettingsSet(_action: string, args: Record<string, unknown>, config: GodotConfig) {
  const resolvedPath = getResolvedProjectPath(args, config)
  const key = args.key as string
  const value = args.value as string
  if (!key || value === undefined)
    throw new GodotMCPError('key and value required', 'INVALID_ARGS', 'Provide key and value.')

  validateNoNewlines('Invalid key format', key)
  validateNoNewlines('Invalid value format', value)

  const configPath = join(resolvedPath, 'project.godot')

  let content: string
  try {
    content = await readFile(configPath, 'utf-8')
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new GodotMCPError('No project.godot found', 'PROJECT_NOT_FOUND', 'Verify the project path.')
    }
    throw err
  }
  const updated = setSettingInContent(content, key, value)
  await writeFile(configPath, updated, 'utf-8')

  return formatSuccess(`Set ${key} = ${value}`)
}

async function handleProjectExport(_action: string, args: Record<string, unknown>, config: GodotConfig) {
  if (!config.godotPath)
    throw new GodotMCPError('Godot not found', 'GODOT_NOT_FOUND', 'Set GODOT_PATH env var or install Godot.')

  const resolvedProjectPath = getResolvedProjectPath(args, config)

  const preset = args.preset as string
  const outputPath = args.output_path as string
  if (!preset || !outputPath) {
    throw new GodotMCPError('preset and output_path required', 'INVALID_ARGS', 'Provide preset name and output path.')
  }

  if (typeof preset !== 'string' || typeof outputPath !== 'string') {
    throw new GodotMCPError('Invalid arguments', 'INVALID_ARGS', 'Preset and output path must be strings.')
  }

  if (preset.startsWith('-') || outputPath.startsWith('-')) {
    throw new GodotMCPError('Invalid arguments', 'INVALID_ARGS', 'Preset and output path must not start with a hyphen.')
  }

  const result = await execGodotAsync(config.godotPath, [
    '--headless',
    '--path',
    resolvedProjectPath,
    '--export-release',
    preset,
    safeResolve(resolvedProjectPath, outputPath),
  ])

  return formatSuccess(`Export complete: ${outputPath}\n${result.stdout}`)
}

const PROJECT_ACTIONS: Record<
  string,
  (
    action: string,
    args: Record<string, unknown>,
    config: GodotConfig,
  ) => Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }>
> = {
  info: handleProjectInfo,
  version: handleProjectVersion,
  run: handleProjectRun,
  stop: handleProjectStop,
  settings_get: handleProjectSettingsGet,
  settings_set: handleProjectSettingsSet,
  export: handleProjectExport,
}

export async function handleProject(action: string, args: Record<string, unknown>, config: GodotConfig) {
  const handler = PROJECT_ACTIONS[action]
  if (handler) {
    return handler(action, args, config)
  }

  throwUnknownAction(action, Object.keys(PROJECT_ACTIONS))
}
