/**
 * Scripts tool - GDScript file management
 * Actions: create | read | write | attach | list | delete
 */

import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, unlinkSync, writeFileSync } from 'node:fs'
import { dirname, extname, join, relative, resolve } from 'node:path'
import type { GodotConfig } from '../../godot/types.js'
import { formatJSON, formatSuccess, GodotMCPError } from '../helpers/errors.js'
import { getTemplate } from '../helpers/templates.js'

function findScriptFiles(dir: string): string[] {
  const results: string[] = []
  try {
    const entries = readdirSync(dir)
    for (const entry of entries) {
      if (entry.startsWith('.') || entry === 'node_modules' || entry === 'build' || entry === 'addons') continue
      const fullPath = join(dir, entry)
      const stat = statSync(fullPath)
      if (stat.isDirectory()) {
        results.push(...findScriptFiles(fullPath))
      } else if (extname(entry) === '.gd') {
        results.push(fullPath)
      }
    }
  } catch {
    // Skip inaccessible
  }
  return results
}

export async function handleScripts(action: string, args: Record<string, unknown>, config: GodotConfig) {
  const projectPath = (args.project_path as string) || config.projectPath

  switch (action) {
    case 'create': {
      const scriptPath = args.script_path as string
      if (!scriptPath)
        throw new GodotMCPError('No script_path specified', 'INVALID_ARGS', 'Provide script_path (e.g., "player.gd").')
      const extendsType = (args.extends as string) || 'Node'
      const content = (args.content as string) || getTemplate(extendsType)

      const fullPath = projectPath ? resolve(projectPath, scriptPath) : resolve(scriptPath)
      if (existsSync(fullPath)) {
        throw new GodotMCPError(
          `Script already exists: ${scriptPath}`,
          'SCRIPT_ERROR',
          'Use write action to modify existing scripts.',
        )
      }

      mkdirSync(dirname(fullPath), { recursive: true })
      writeFileSync(fullPath, content, 'utf-8')
      return formatSuccess(`Created script: ${scriptPath}\nExtends: ${extendsType}`)
    }

    case 'read': {
      const scriptPath = args.script_path as string
      if (!scriptPath) throw new GodotMCPError('No script_path specified', 'INVALID_ARGS', 'Provide script_path.')

      const fullPath = projectPath ? resolve(projectPath, scriptPath) : resolve(scriptPath)
      if (!existsSync(fullPath))
        throw new GodotMCPError(`Script not found: ${scriptPath}`, 'SCRIPT_ERROR', 'Check the file path.')

      const content = readFileSync(fullPath, 'utf-8')
      return formatSuccess(`File: ${scriptPath}\n\n${content}`)
    }

    case 'write': {
      const scriptPath = args.script_path as string
      if (!scriptPath) throw new GodotMCPError('No script_path specified', 'INVALID_ARGS', 'Provide script_path.')
      const content = args.content as string
      if (content === undefined || content === null)
        throw new GodotMCPError('No content specified', 'INVALID_ARGS', 'Provide content to write.')

      const fullPath = projectPath ? resolve(projectPath, scriptPath) : resolve(scriptPath)
      mkdirSync(dirname(fullPath), { recursive: true })
      writeFileSync(fullPath, content, 'utf-8')
      return formatSuccess(`Written: ${scriptPath} (${content.length} chars)`)
    }

    case 'attach': {
      const scenePath = args.scene_path as string
      const scriptPath = args.script_path as string
      const nodeName = args.node_name as string
      if (!scenePath || !scriptPath) {
        throw new GodotMCPError(
          'Both scene_path and script_path required',
          'INVALID_ARGS',
          'Provide scene_path and script_path.',
        )
      }

      const sceneFullPath = projectPath ? resolve(projectPath, scenePath) : resolve(scenePath)
      if (!existsSync(sceneFullPath))
        throw new GodotMCPError(`Scene not found: ${scenePath}`, 'SCENE_ERROR', 'Create the scene first.')

      let content = readFileSync(sceneFullPath, 'utf-8')
      const resPath = `res://${scriptPath.replace(/\\/g, '/')}`

      if (nodeName) {
        const nodePattern = new RegExp(`(\\[node name="${nodeName}"[^\\]]*\\])`)
        const match = content.match(nodePattern)
        if (!match)
          throw new GodotMCPError(
            `Node "${nodeName}" not found in scene`,
            'NODE_ERROR',
            'Check node name with nodes.list action.',
          )
        content = content.replace(nodePattern, `$1\nscript = ExtResource("${resPath}")`)
      } else {
        content = content.replace(/(\[node [^\]]+\])/, `$1\nscript = ExtResource("${resPath}")`)
      }

      writeFileSync(sceneFullPath, content, 'utf-8')
      return formatSuccess(`Attached script ${scriptPath} to ${nodeName || 'root node'} in ${scenePath}`)
    }

    case 'list': {
      if (!projectPath)
        throw new GodotMCPError('No project path specified', 'INVALID_ARGS', 'Provide project_path argument.')

      const resolvedPath = resolve(projectPath)
      const scripts = findScriptFiles(resolvedPath)
      const relativePaths = scripts.map((s) => relative(resolvedPath, s).replace(/\\/g, '/'))

      return formatJSON({ project: resolvedPath, count: relativePaths.length, scripts: relativePaths })
    }

    case 'delete': {
      const scriptPath = args.script_path as string
      if (!scriptPath)
        throw new GodotMCPError('No script_path specified', 'INVALID_ARGS', 'Provide script_path to delete.')

      const fullPath = projectPath ? resolve(projectPath, scriptPath) : resolve(scriptPath)
      if (!existsSync(fullPath))
        throw new GodotMCPError(`Script not found: ${scriptPath}`, 'SCRIPT_ERROR', 'Check the file path.')

      unlinkSync(fullPath)
      return formatSuccess(`Deleted script: ${scriptPath}`)
    }

    default:
      throw new GodotMCPError(
        `Unknown action: ${action}`,
        'INVALID_ACTION',
        'Valid actions: create, read, write, attach, list, delete. Use help tool for full docs.',
      )
  }
}
