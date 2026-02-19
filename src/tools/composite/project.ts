/**
 * Project tool - Godot project management
 * Actions: info | version | run | stop | settings_get | settings_set | export
 */

import { execSync } from 'node:child_process'
import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { execGodotSync, runGodotProject } from '../../godot/headless.js'
import type { GodotConfig, ProjectInfo } from '../../godot/types.js'
import { formatJSON, formatSuccess, GodotMCPError } from '../helpers/errors.js'
import { safeResolve } from '../helpers/paths.js'
import { getSetting, parseProjectSettings, setSettingInContent } from '../helpers/project-settings.js'

function parseProjectGodot(projectPath: string): ProjectInfo {
  const configPath = join(projectPath, 'project.godot')
  if (!existsSync(configPath)) {
    throw new GodotMCPError(
      `No project.godot found at ${projectPath}`,
      'PROJECT_NOT_FOUND',
      'Verify the project path contains a valid Godot project.',
    )
  }

  const content = readFileSync(configPath, 'utf-8')
  const lines = content.split('\n')

  const info: ProjectInfo = { name: 'Unknown', configVersion: 5, mainScene: null, features: [], settings: {} }
  let currentSection = ''

  for (const line of lines) {
    const trimmed = line.trim()

    const sectionMatch = trimmed.match(/^\[(.+)\]$/)
    if (sectionMatch) {
      currentSection = sectionMatch[1]
      continue
    }

    const kvMatch = trimmed.match(/^(\S+)\s*=\s*(.+)$/)
    if (!kvMatch) continue

    const [, key, rawValue] = kvMatch
    const value = rawValue.replace(/^"(.*)"$/, '$1')

    if (currentSection === '' || currentSection === 'application') {
      if (key === 'config/name') info.name = value
      if (key === 'run/main_scene') info.mainScene = value
      if (key === 'config/features') {
        const featMatch = rawValue.match(/PackedStringArray\((.+)\)/)
        if (featMatch) {
          info.features = featMatch[1].split(',').map((f) => f.trim().replace(/"/g, ''))
        }
      }
    }

    if (key === 'config_version') info.configVersion = Number.parseInt(value, 10)
    info.settings[`${currentSection ? `${currentSection}/` : ''}${key}`] = value
  }

  return info
}

export async function handleProject(action: string, args: Record<string, unknown>, config: GodotConfig) {
  switch (action) {
    case 'info': {
      const projectPath = (args.project_path as string) || config.projectPath
      if (!projectPath) {
        throw new GodotMCPError(
          'No project path specified',
          'INVALID_ARGS',
          'Provide project_path argument or set it via config.set action.',
        )
      }
      const info = parseProjectGodot(resolve(projectPath))
      return formatJSON(info)
    }

    case 'version': {
      if (!config.godotPath) {
        throw new GodotMCPError('Godot not found', 'GODOT_NOT_FOUND', 'Set GODOT_PATH env var or install Godot.')
      }
      const result = execGodotSync(config.godotPath, ['--version'])
      return formatSuccess(`Godot version: ${result.stdout}`)
    }

    case 'run': {
      if (!config.godotPath)
        throw new GodotMCPError('Godot not found', 'GODOT_NOT_FOUND', 'Set GODOT_PATH env var or install Godot.')
      const projectPath = (args.project_path as string) || config.projectPath
      if (!projectPath)
        throw new GodotMCPError('No project path specified', 'INVALID_ARGS', 'Provide project_path argument.')
      const { pid } = runGodotProject(config.godotPath, resolve(projectPath))
      return formatSuccess(`Godot project started (PID: ${pid})`)
    }

    case 'stop': {
      try {
        if (process.platform === 'win32') {
          execSync('taskkill /F /IM godot.exe /T', { stdio: 'pipe' })
        } else {
          execSync('pkill -f godot', { stdio: 'pipe' })
        }
        return formatSuccess('Godot processes stopped')
      } catch {
        return formatSuccess('No running Godot processes found')
      }
    }

    case 'settings_get': {
      const projectPath = (args.project_path as string) || config.projectPath
      if (!projectPath) throw new GodotMCPError('No project path specified', 'INVALID_ARGS', 'Provide project_path.')
      const key = args.key as string
      if (!key)
        throw new GodotMCPError('No key specified', 'INVALID_ARGS', 'Provide key (e.g., "application/config/name").')

      const configPath = safeResolve(projectPath, 'project.godot')
      if (!existsSync(configPath))
        throw new GodotMCPError('No project.godot found', 'PROJECT_NOT_FOUND', 'Verify the project path.')

      const settings = parseProjectSettings(configPath)
      const value = getSetting(settings, key)

      return formatJSON({ key, value: value ?? null })
    }

    case 'settings_set': {
      const projectPath = (args.project_path as string) || config.projectPath
      if (!projectPath) throw new GodotMCPError('No project path specified', 'INVALID_ARGS', 'Provide project_path.')
      const key = args.key as string
      const value = args.value as string
      if (!key || value === undefined)
        throw new GodotMCPError('key and value required', 'INVALID_ARGS', 'Provide key and value.')

      const configPath = safeResolve(projectPath, 'project.godot')
      if (!existsSync(configPath))
        throw new GodotMCPError('No project.godot found', 'PROJECT_NOT_FOUND', 'Verify the project path.')

      const content = readFileSync(configPath, 'utf-8')
      const updated = setSettingInContent(content, key, value)
      writeFileSync(configPath, updated, 'utf-8')

      return formatSuccess(`Set ${key} = ${value}`)
    }

    case 'export': {
      if (!config.godotPath)
        throw new GodotMCPError('Godot not found', 'GODOT_NOT_FOUND', 'Set GODOT_PATH env var or install Godot.')
      const projectPath = (args.project_path as string) || config.projectPath
      if (!projectPath) throw new GodotMCPError('No project path specified', 'INVALID_ARGS', 'Provide project_path.')
      const preset = args.preset as string
      const outputPath = args.output_path as string
      if (!preset || !outputPath) {
        throw new GodotMCPError(
          'preset and output_path required',
          'INVALID_ARGS',
          'Provide preset name and output path.',
        )
      }

      const result = execGodotSync(config.godotPath, [
        '--headless',
        '--path',
        resolve(projectPath),
        '--export-release',
        preset,
        safeResolve(projectPath, outputPath),
      ])

      return formatSuccess(`Export complete: ${outputPath}\n${result.stdout}`)
    }

    default:
      throw new GodotMCPError(
        `Unknown action: ${action}`,
        'INVALID_ACTION',
        'Valid actions: info, version, run, stop, settings_get, settings_set, export. Use help tool for full docs.',
      )
  }
}
