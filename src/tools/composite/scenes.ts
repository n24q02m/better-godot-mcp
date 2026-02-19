/**
 * Scenes tool - Scene file management
 * Actions: create | list | info | delete | duplicate | set_main
 */

import { existsSync } from 'node:fs'
import { copyFile, mkdir, readdir, readFile, stat, unlink, writeFile } from 'node:fs/promises'
import { basename, dirname, extname, join, relative, resolve } from 'node:path'
import type { GodotConfig, SceneInfo, SceneNode } from '../../godot/types.js'
import { formatJSON, formatSuccess, GodotMCPError } from '../helpers/errors.js'
import { setSettingInContent } from '../helpers/project-settings.js'

/**
 * Parse a .tscn file to extract scene information
 */
async function parseTscnFile(filePath: string): Promise<SceneInfo> {
  const content = await readFile(filePath, 'utf-8')
  const lines = content.split('\n')

  const nodes: SceneNode[] = []
  const resources: string[] = []
  let rootNode = ''
  let rootType = ''

  for (const line of lines) {
    const trimmed = line.trim()

    const nodeMatch = trimmed.match(/^\[node\s+name="([^"]+)"\s+type="([^"]+)"(?:\s+parent="([^"]*)")?/)
    if (nodeMatch) {
      const node: SceneNode = {
        name: nodeMatch[1],
        type: nodeMatch[2],
        parent: nodeMatch[3] ?? null,
        properties: {},
        script: null,
      }

      if (!node.parent && nodes.length === 0) {
        rootNode = node.name
        rootType = node.type
      }

      nodes.push(node)
      continue
    }

    const resMatch = trimmed.match(/^\[(ext_resource|sub_resource)\s+(.+)\]$/)
    if (resMatch) {
      resources.push(trimmed)
      continue
    }

    if (trimmed.startsWith('script') && nodes.length > 0) {
      const scriptMatch = trimmed.match(/^script\s*=\s*(.+)$/)
      if (scriptMatch) {
        nodes[nodes.length - 1].script = scriptMatch[1]
      }
    }
  }

  return { path: filePath, rootNode, rootType, nodeCount: nodes.length, nodes, resources }
}

/**
 * Recursively find all .tscn files in a directory
 */
async function findSceneFiles(dir: string): Promise<string[]> {
  const results: string[] = []

  try {
    const entries = await readdir(dir)
    const promises = entries.map(async (entry) => {
      if (entry.startsWith('.') || entry === 'node_modules' || entry === 'build') return []

      const fullPath = join(dir, entry)
      const st = await stat(fullPath)

      if (st.isDirectory()) {
        return findSceneFiles(fullPath)
      } else if (extname(entry) === '.tscn') {
        return [fullPath]
      }
      return []
    })

    const nested = await Promise.all(promises)
    results.push(...nested.flat())
  } catch {
    // Skip inaccessible directories
  }

  return results
}

function generateTscnContent(rootName: string, rootType: string): string {
  return [`[gd_scene format=3]`, '', `[node name="${rootName}" type="${rootType}"]`, ''].join('\n')
}

export async function handleScenes(action: string, args: Record<string, unknown>, config: GodotConfig) {
  const projectPath = (args.project_path as string) || config.projectPath

  switch (action) {
    case 'create': {
      if (!projectPath) {
        throw new GodotMCPError('No project path specified', 'INVALID_ARGS', 'Provide project_path argument.')
      }
      const scenePath = args.scene_path as string
      if (!scenePath) {
        throw new GodotMCPError(
          'No scene_path specified',
          'INVALID_ARGS',
          'Provide scene_path (e.g., "scenes/main.tscn").',
        )
      }
      const rootType = (args.root_type as string) || 'Node2D'
      const rootName = (args.root_name as string) || basename(scenePath, '.tscn')

      const fullPath = resolve(projectPath, scenePath)
      // We can use existsSync for quick check before async ops, or just handle error in write.
      // But preserving existing behavior:
      if (existsSync(fullPath)) {
        throw new GodotMCPError(
          `Scene already exists: ${scenePath}`,
          'SCENE_ERROR',
          'Use a different path or delete the existing scene first.',
        )
      }

      const content = generateTscnContent(rootName, rootType)
      await mkdir(dirname(fullPath), { recursive: true })
      await writeFile(fullPath, content, 'utf-8')

      return formatSuccess(`Created scene: ${scenePath}\nRoot: ${rootName} (${rootType})`)
    }

    case 'list': {
      if (!projectPath) {
        throw new GodotMCPError('No project path specified', 'INVALID_ARGS', 'Provide project_path argument.')
      }
      const resolvedPath = resolve(projectPath)
      const scenes = await findSceneFiles(resolvedPath)
      const relativePaths = scenes.map((s) => relative(resolvedPath, s).replace(/\\/g, '/'))

      return formatJSON({
        project: resolvedPath,
        count: relativePaths.length,
        scenes: relativePaths,
      })
    }

    case 'info': {
      const scenePath = args.scene_path as string
      if (!scenePath) {
        throw new GodotMCPError('No scene_path specified', 'INVALID_ARGS', 'Provide scene_path to parse.')
      }
      const fullPath = projectPath ? resolve(projectPath, scenePath) : resolve(scenePath)
      if (!existsSync(fullPath)) {
        throw new GodotMCPError(`Scene not found: ${scenePath}`, 'SCENE_ERROR', 'Check the file path and try again.')
      }

      const info = await parseTscnFile(fullPath)
      return formatJSON(info)
    }

    case 'delete': {
      const scenePath = args.scene_path as string
      if (!scenePath) {
        throw new GodotMCPError('No scene_path specified', 'INVALID_ARGS', 'Provide scene_path to delete.')
      }
      const fullPath = projectPath ? resolve(projectPath, scenePath) : resolve(scenePath)
      if (!existsSync(fullPath)) {
        throw new GodotMCPError(`Scene not found: ${scenePath}`, 'SCENE_ERROR', 'Check the file path.')
      }

      await unlink(fullPath)
      return formatSuccess(`Deleted scene: ${scenePath}`)
    }

    case 'duplicate': {
      const scenePath = args.scene_path as string
      const newPath = args.new_path as string
      if (!scenePath || !newPath) {
        throw new GodotMCPError(
          'Both scene_path and new_path required',
          'INVALID_ARGS',
          'Provide source and destination paths.',
        )
      }
      const srcFull = projectPath ? resolve(projectPath, scenePath) : resolve(scenePath)
      const dstFull = projectPath ? resolve(projectPath, newPath) : resolve(newPath)
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

      await mkdir(dirname(dstFull), { recursive: true })
      await copyFile(srcFull, dstFull)
      return formatSuccess(`Duplicated: ${scenePath} -> ${newPath}`)
    }

    case 'set_main': {
      if (!projectPath) {
        throw new GodotMCPError('No project path specified', 'INVALID_ARGS', 'Provide project_path.')
      }
      const scenePath = args.scene_path as string
      if (!scenePath) {
        throw new GodotMCPError('No scene_path specified', 'INVALID_ARGS', 'Provide scene_path to set as main.')
      }

      const configPath = join(resolve(projectPath), 'project.godot')
      if (!existsSync(configPath)) {
        throw new GodotMCPError('No project.godot found', 'PROJECT_NOT_FOUND', 'Verify the project path.')
      }

      const resPath = `res://${scenePath.replace(/\\/g, '/')}`
      const content = await readFile(configPath, 'utf-8')
      const updated = setSettingInContent(content, 'application/run/main_scene', `"${resPath}"`)
      await writeFile(configPath, updated, 'utf-8')

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
