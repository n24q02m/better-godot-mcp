/**
 * Scenes tool - Scene file management
 * Actions: create | list | info | delete | duplicate | set_main
 */

import { copyFile, mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import type { GodotConfig, SceneInfo, SceneNode } from '../../godot/types.js'
import { formatJSON, formatSuccess, GodotMCPError, throwUnknownAction } from '../helpers/errors.js'
import { pathExists, safeResolve } from '../helpers/paths.js'
import { setSettingInContent } from '../helpers/project-settings.js'

// Pre-compiled regex for parsing scene metadata without splitting lines
const rxNode = /^\[node\s+name="([^"]+)"\s+type="([^"]+)"(?:\s+parent="([^"]*)")?/
const rxScript = /^script\s*=\s*(.+)$/

/**
 * Parse a .tscn file to extract scene information
 * Optimized to use direct string index traversal to avoid memory allocations from split('\n')
 * Parses .tscn files ~2x faster
 */
async function parseTscnFile(filePath: string): Promise<SceneInfo> {
  const content = await readFile(filePath, 'utf-8')

  const nodes: SceneNode[] = []
  const resources: string[] = []
  let rootNode = ''
  let rootType = ''

  let pos = 0
  const len = content.length

  while (pos < len) {
    let nextNewline = content.indexOf('\n', pos)
    if (nextNewline === -1) nextNewline = len

    // Trim line manually
    let start = pos
    let end = nextNewline
    while (start < end && content.charCodeAt(start) <= 32) start++
    while (end > start && content.charCodeAt(end - 1) <= 32) end--

    if (start < end) {
      const firstChar = content.charCodeAt(start)

      if (firstChar === 91) {
        // '[' character indicates a new section
        const line = content.slice(start, end)
        if (line.startsWith('[node ')) {
          const nodeMatch = line.match(rxNode)
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
          }
        } else if (line.startsWith('[ext_resource') || line.startsWith('[sub_resource')) {
          resources.push(line)
        }
      } else if (firstChar === 115 && nodes.length > 0) {
        // 's' character, check for script
        const line = content.slice(start, end)
        if (line.startsWith('script')) {
          const scriptMatch = line.match(rxScript)
          if (scriptMatch) {
            nodes[nodes.length - 1].script = scriptMatch[1]
          }
        }
      }
    }

    pos = nextNewline + 1
  }

  return { path: filePath, rootNode, rootType, nodeCount: nodes.length, nodes, resources }
}

/**
 * Recursively find all .tscn files in a directory
 */
async function findSceneFiles(dir: string, results: string[] = []): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    const promises: Promise<string[]>[] = []

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]
      const name = entry.name
      if (name.startsWith('.') || name === 'node_modules' || name === 'build') continue

      const fullPath = join(dir, name)
      if (entry.isDirectory()) {
        promises.push(findSceneFiles(fullPath, results))
      } else if (name.endsWith('.tscn')) {
        results.push(fullPath)
      }
    }

    if (promises.length > 0) {
      await Promise.all(promises)
    }
    return results
  } catch {
    // Skip inaccessible directories
    return results
  }
}

function generateTscnContent(rootName: string, rootType: string): string {
  return [`[gd_scene format=3]`, '', `[node name="${rootName}" type="${rootType}"]`, ''].join('\n')
}

function validateSceneArgs(action: string, args: Record<string, unknown>, config: GodotConfig) {
  const baseDir = config.projectPath || process.cwd()
  // Validate args.project_path against the trusted baseDir to prevent path traversal vulnerabilities
  const projectPath = args.project_path
    ? safeResolve(baseDir, args.project_path as string)
    : config.projectPath || undefined
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
  const baseDir = config.projectPath || process.cwd()
  const { projectPath, scenePath, newPath } = validateSceneArgs(action, args, config)

  switch (action) {
    case 'create': {
      // projectPath and scenePath are guaranteed by validation
      const rootType = (args.root_type as string) || 'Node2D'
      const rootName = (args.root_name as string) || basename(scenePath, '.tscn')

      if (rootName.includes('"') || rootName.includes('\n') || rootName.includes('\r')) {
        throw new GodotMCPError('Invalid root name', 'INVALID_ARGS', 'Root name must not contain quotes or newlines.')
      }

      if (rootType.includes('"') || rootType.includes('\n') || rootType.includes('\r')) {
        throw new GodotMCPError('Invalid root type', 'INVALID_ARGS', 'Root type must not contain quotes or newlines.')
      }

      const fullPath = safeResolve(projectPath as string, scenePath)
      if (await pathExists(fullPath)) {
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
      // projectPath is guaranteed
      const resolvedPath = safeResolve(baseDir, projectPath as string)
      const scenes = await findSceneFiles(resolvedPath)

      // OPTIMIZATION: Use substring and a pre-allocated array instead of .map() and node:path.relative
      // for significantly faster execution on large arrays of prefixed paths.
      const prefixLen = resolvedPath.length + (resolvedPath.endsWith('/') || resolvedPath.endsWith('\\') ? 0 : 1)
      const relativePaths = new Array(scenes.length)
      for (let i = 0; i < scenes.length; i++) {
        // ⚡ Bolt: Using replaceAll('\\', '/') avoids RegExp allocation overhead
        relativePaths[i] = scenes[i].substring(prefixLen).replaceAll('\\', '/')
      }

      return formatJSON({
        project: resolvedPath,
        count: relativePaths.length,
        scenes: relativePaths,
      })
    }

    case 'info': {
      // scenePath is guaranteed
      const fullPath = resolvePath(projectPath, scenePath)
      if (!(await pathExists(fullPath))) {
        throw new GodotMCPError(`Scene not found: ${scenePath}`, 'SCENE_ERROR', 'Check the file path and try again.')
      }

      const info = await parseTscnFile(fullPath)
      return formatJSON(info)
    }

    case 'delete': {
      // scenePath is guaranteed
      const fullPath = resolvePath(projectPath, scenePath)
      if (!(await pathExists(fullPath))) {
        throw new GodotMCPError(`Scene not found: ${scenePath}`, 'SCENE_ERROR', 'Check the file path.')
      }

      await unlink(fullPath)
      return formatSuccess(`Deleted scene: ${scenePath}`)
    }

    case 'duplicate': {
      // scenePath and newPath are guaranteed
      const srcFull = resolvePath(projectPath, scenePath)
      const dstFull = resolvePath(projectPath, newPath as string)

      if (!(await pathExists(srcFull))) {
        throw new GodotMCPError(`Source scene not found: ${scenePath}`, 'SCENE_ERROR', 'Check the source path.')
      }
      if (await pathExists(dstFull)) {
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
      // projectPath and scenePath are guaranteed
      if (scenePath.includes('"')) {
        throw new GodotMCPError('Invalid scene path', 'INVALID_ARGS', 'Scene path must not contain quotes.')
      }

      const configPath = join(safeResolve(baseDir, projectPath as string), 'project.godot')
      if (!(await pathExists(configPath))) {
        throw new GodotMCPError('No project.godot found', 'PROJECT_NOT_FOUND', 'Verify the project path.')
      }

      // ⚡ Bolt: Using replaceAll('\\', '/') avoids RegExp allocation overhead
      const resPath = `res://${scenePath.replaceAll('\\', '/')}`
      const content = await readFile(configPath, 'utf-8')
      const updated = setSettingInContent(content, 'application/run/main_scene', `"${resPath}"`)
      await writeFile(configPath, updated, 'utf-8')

      return formatSuccess(`Set main scene: ${resPath}`)
    }

    default:
      throwUnknownAction(action, ['create', 'list', 'info', 'delete', 'duplicate', 'set_main'])
  }
}
