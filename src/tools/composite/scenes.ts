/**
 * Scenes tool - Scene file management
 * Actions: create | list | info | delete | duplicate | set_main
 */

import { copyFileSync, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from 'node:fs'
import { readdir, readFile } from 'node:fs/promises'
import { basename, dirname, extname, join, relative, resolve } from 'node:path'
import type { GodotConfig, SceneInfo, SceneNode } from '../../godot/types.js'
import { formatJSON, formatSuccess, GodotMCPError } from '../helpers/errors.js'
import { safeResolve } from '../helpers/paths.js'
import { setSettingInContent } from '../helpers/project-settings.js'
import { parseSceneContent, type SceneNodeInfo } from '../helpers/scene-parser.js'

/**
 * Parse a .tscn file to extract scene information
 */
async function parseTscnFile(filePath: string): Promise<SceneInfo> {
  const content = await readFile(filePath, 'utf-8')
  const parsed = parseSceneContent(content)

  const nodes: SceneNode[] = parsed.nodes.map((n: SceneNodeInfo) => {
    const properties = { ...n.properties }
    let script: string | null = null

    if (properties.script) {
      script = properties.script
      delete properties.script
    }

    return {
      name: n.name,
      type: n.type || 'Node',
      parent: n.parent || null,
      properties,
      script,
    }
  })

  let rootNode = ''
  let rootType = ''

  if (nodes.length > 0 && !nodes[0].parent) {
    rootNode = nodes[0].name
    rootType = nodes[0].type
  }

  // Extract raw resource lines to match previous behavior
  const resources: string[] = []
  const lines = content.split('\n')
  for (const line of lines) {
    if (line.startsWith('[ext_resource') || line.startsWith('[sub_resource')) {
      resources.push(line.trim())
    }
  }

  return { path: filePath, rootNode, rootType, nodeCount: nodes.length, nodes, resources }
}

/**
 * Recursively find all .tscn files in a directory
 */
async function findSceneFiles(dir: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    const promises = entries.map(async (entry) => {
      const name = entry.name
      if (name.startsWith('.') || name === 'node_modules' || name === 'build') return []

      const fullPath = join(dir, name)
      if (entry.isDirectory()) {
        return findSceneFiles(fullPath)
      } else if (extname(name) === '.tscn') {
        return [fullPath]
      }
      return []
    })

    const nestedResults = await Promise.all(promises)
    return nestedResults.flat()
  } catch {
    // Skip inaccessible directories
    return []
  }
}

function generateTscnContent(rootName: string, rootType: string): string {
  return [`[gd_scene format=3]`, '', `[node name="${rootName}" type="${rootType}"]`, ''].join('\n')
}

function validateSceneArgs(action: string, args: Record<string, unknown>, config: GodotConfig) {
  const projectPath = (args.project_path as string) || config.projectPath || undefined
  const scenePath = args.scene_path as string
  const newPath = args.new_path as string

  // project_path required
  if (['create', 'list', 'set_main'].includes(action) && !projectPath) {
    throw new GodotMCPError('No project path specified', 'INVALID_ARGS', 'Provide project_path argument.')
  }

  // scene_path required
  if (['create', 'info', 'delete', 'set_main'].includes(action) && !scenePath) {
    const suggestion =
      action === 'set_main'
        ? 'Provide scene_path to set as main.'
        : action === 'info'
          ? 'Provide scene_path to parse.'
          : action === 'delete'
            ? 'Provide scene_path to delete.'
            : 'Provide scene_path (e.g., "scenes/main.tscn").'
    throw new GodotMCPError('No scene_path specified', 'INVALID_ARGS', suggestion)
  }

  // duplicate specifically requires both
  if (action === 'duplicate' && (!scenePath || !newPath)) {
    throw new GodotMCPError(
      'Both scene_path and new_path required',
      'INVALID_ARGS',
      'Provide source and destination paths.',
    )
  }

  return { projectPath, scenePath, newPath }
}

function resolvePath(base: string | undefined, relativePath: string): string {
  if (base) return safeResolve(base, relativePath)
  return safeResolve(process.cwd(), relativePath)
}

export async function handleScenes(action: string, args: Record<string, unknown>, config: GodotConfig) {
  const { projectPath, scenePath, newPath } = validateSceneArgs(action, args, config)

  switch (action) {
    case 'create': {
      // projectPath and scenePath are guaranteed by validation
      const rootType = (args.root_type as string) || 'Node2D'
      const rootName = (args.root_name as string) || basename(scenePath, '.tscn')

      const fullPath = safeResolve(projectPath as string, scenePath)
      if (existsSync(fullPath)) {
        throw new GodotMCPError(
          `Scene already exists: ${scenePath}`,
          'SCENE_ERROR',
          'Use a different path or delete the existing scene first.',
        )
      }

      const content = generateTscnContent(rootName, rootType)
      mkdirSync(dirname(fullPath), { recursive: true })
      writeFileSync(fullPath, content, 'utf-8')

      return formatSuccess(`Created scene: ${scenePath}\nRoot: ${rootName} (${rootType})`)
    }

    case 'list': {
      // projectPath is guaranteed
      const resolvedPath = resolve(projectPath as string)
      const scenes = await findSceneFiles(resolvedPath)
      const relativePaths = scenes.map((s) => relative(resolvedPath, s).replace(/\\/g, '/'))

      return formatJSON({
        project: resolvedPath,
        count: relativePaths.length,
        scenes: relativePaths,
      })
    }

    case 'info': {
      // scenePath is guaranteed
      const fullPath = resolvePath(projectPath, scenePath)
      if (!existsSync(fullPath)) {
        throw new GodotMCPError(`Scene not found: ${scenePath}`, 'SCENE_ERROR', 'Check the file path and try again.')
      }

      const info = await parseTscnFile(fullPath)
      return formatJSON(info)
    }

    case 'delete': {
      // scenePath is guaranteed
      const fullPath = resolvePath(projectPath, scenePath)
      if (!existsSync(fullPath)) {
        throw new GodotMCPError(`Scene not found: ${scenePath}`, 'SCENE_ERROR', 'Check the file path.')
      }

      unlinkSync(fullPath)
      return formatSuccess(`Deleted scene: ${scenePath}`)
    }

    case 'duplicate': {
      // scenePath and newPath are guaranteed
      const srcFull = resolvePath(projectPath, scenePath)
      const dstFull = resolvePath(projectPath, newPath as string)

      if (!existsSync(srcFull)) {
        throw new GodotMCPError(`Source scene not found: ${scenePath}`, 'SCENE_ERROR', 'Check the source path.')
      }
      if (existsSync(dstFull)) {
        throw new GodotMCPError(
          `Destination already exists: ${newPath}`,
          'SCENE_ERROR',
          'Choose a different destination.',
        )
      }

      mkdirSync(dirname(dstFull), { recursive: true })
      copyFileSync(srcFull, dstFull)
      return formatSuccess(`Duplicated: ${scenePath} -> ${newPath}`)
    }

    case 'set_main': {
      // projectPath and scenePath are guaranteed
      const configPath = join(resolve(projectPath as string), 'project.godot')
      if (!existsSync(configPath)) {
        throw new GodotMCPError('No project.godot found', 'PROJECT_NOT_FOUND', 'Verify the project path.')
      }

      const resPath = `res://${scenePath.replace(/\\/g, '/')}`
      const content = readFileSync(configPath, 'utf-8')
      const updated = setSettingInContent(content, 'application/run/main_scene', `"${resPath}"`)
      writeFileSync(configPath, updated, 'utf-8')

      return formatSuccess(`Set main scene: ${resPath}`)
    }

    default:
      throw new GodotMCPError(
        `Unknown action: ${action}`,
        'INVALID_ACTION',
        'Valid actions: create, list, info, delete, duplicate, set_main. Use help tool for full docs.',
      )
  }
}
