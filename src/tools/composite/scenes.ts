/**
 * Scenes tool - Scene file management
 * Actions: create | list | info | delete | duplicate | set_main
 */

import { constants } from 'node:fs'
import { copyFile, mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import type { GodotConfig, SceneInfo } from '../../godot/types.js'
import { formatJSON, formatSuccess, GodotMCPError, throwUnknownAction } from '../helpers/errors.js'
import { safeResolve } from '../helpers/paths.js'
import { setSettingInContent } from '../helpers/project-settings.js'
import { parseSceneContent } from '../helpers/scene-parser.js'

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

/**
 * Handle 'create' action
 */
async function handleCreate(
  projectPath: string,
  args: Record<string, unknown>,
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const scenePath = args.scene_path as string
  const rootType = (args.root_type as string) || 'Node2D'
  const rootName = (args.root_name as string) || basename(scenePath, '.tscn')

  if (rootName.includes('"') || rootName.includes('\n') || rootName.includes('\r')) {
    throw new GodotMCPError('Invalid root name', 'INVALID_ARGS', 'Root name must not contain quotes or newlines.')
  }

  if (rootType.includes('"') || rootType.includes('\n') || rootType.includes('\r')) {
    throw new GodotMCPError('Invalid root type', 'INVALID_ARGS', 'Root type must not contain quotes or newlines.')
  }

  const fullPath = safeResolve(projectPath, scenePath)
  const content = generateTscnContent(rootName, rootType)
  await mkdir(dirname(fullPath), { recursive: true })

  try {
    // ⚡ Bolt: Using 'wx' flag for atomic existence check and file creation (EAFP)
    await writeFile(fullPath, content, { encoding: 'utf-8', flag: 'wx' })
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
      throw new GodotMCPError(
        `Scene already exists: ${scenePath}`,
        'SCENE_ERROR',
        'Use a different path or delete the existing scene first.',
      )
    }
    throw error
  }

  return formatSuccess(`Created scene: ${scenePath}\nRoot: ${rootName} (${rootType})`)
}

/**
 * Handle 'list' action
 */
async function handleList(projectPath: string): Promise<{ content: Array<{ type: string; text: string }> }> {
  const scenes = await findSceneFiles(projectPath)

  // OPTIMIZATION: Use substring and a pre-allocated array instead of .map() and node:path.relative
  // for significantly faster execution on large arrays of prefixed paths.
  const prefixLen = projectPath.length + (projectPath.endsWith('/') || projectPath.endsWith('\\') ? 0 : 1)
  const relativePaths = new Array(scenes.length)
  for (let i = 0; i < scenes.length; i++) {
    // ⚡ Bolt: Using replaceAll('\\', '/') avoids RegExp allocation overhead
    relativePaths[i] = scenes[i].substring(prefixLen).replaceAll('\\', '/')
  }

  return formatJSON({
    project: projectPath,
    count: relativePaths.length,
    scenes: relativePaths,
  })
}

/**
 * Handle 'info' action
 */
async function handleInfo(
  projectPath: string,
  args: Record<string, unknown>,
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const scenePath = args.scene_path as string
  const fullPath = safeResolve(projectPath, scenePath)
  let rawContent: string
  try {
    rawContent = await readFile(fullPath, 'utf-8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new GodotMCPError(`Scene not found: ${scenePath}`, 'SCENE_ERROR', 'Check the file path.')
    }
    throw error
  }
  const scene = parseSceneContent(rawContent)
  const info: SceneInfo = {
    path: scenePath,
    rootNode: scene.nodes[0]?.name || '',
    rootType: scene.nodes[0]?.type || '',
    nodeCount: scene.nodes.length,
    nodes: scene.nodes.map((n) => ({
      name: n.name,
      type: n.type || 'Node',
      parent: n.parent || null,
      properties: n.properties,
      script: n.properties.script || null,
    })),
    resources: scene.extResources.map((r) => `[ext_resource type="${r.type}" path="${r.path}" id="${r.id}"]`),
  }
  return formatJSON(info)
}

/**
 * Handle 'delete' action
 */
async function handleDelete(
  projectPath: string,
  args: Record<string, unknown>,
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const scenePath = args.scene_path as string
  const fullPath = safeResolve(projectPath, scenePath)
  try {
    await unlink(fullPath)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new GodotMCPError(`Scene not found: ${scenePath}`, 'SCENE_ERROR', 'Check the file path.')
    }
    throw error
  }
  return formatSuccess(`Deleted scene: ${scenePath}`)
}

/**
 * Handle 'duplicate' action
 */
async function handleDuplicate(
  projectPath: string,
  args: Record<string, unknown>,
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const scenePath = args.scene_path as string
  const newPath = args.new_path as string
  const srcFull = safeResolve(projectPath, scenePath)
  const dstFull = safeResolve(projectPath, newPath)

  await mkdir(dirname(dstFull), { recursive: true })
  try {
    // ⚡ Bolt: Using COPYFILE_EXCL for atomic existence check and copy (EAFP)
    await copyFile(srcFull, dstFull, constants.COPYFILE_EXCL)
  } catch (error) {
    const err = error as NodeJS.ErrnoException
    if (err.code === 'EEXIST') {
      throw new GodotMCPError(
        `Destination already exists: ${newPath}`,
        'SCENE_ERROR',
        'Choose a different destination.',
      )
    }
    if (err.code === 'ENOENT') {
      throw new GodotMCPError(`Source scene not found: ${scenePath}`, 'SCENE_ERROR', 'Check the source path.')
    }
    throw error
  }
  return formatSuccess(`Duplicated: ${scenePath} -> ${newPath}`)
}

/**
 * Handle 'set_main' action
 */
async function handleSetMain(
  projectPath: string,
  args: Record<string, unknown>,
): Promise<{ content: Array<{ type: string; text: string }> }> {
  const scenePath = args.scene_path as string
  if (scenePath.includes('"') || scenePath.includes('\n') || scenePath.includes('\r')) {
    throw new GodotMCPError('Invalid scene path', 'INVALID_ARGS', 'Scene path must not contain quotes or newlines.')
  }

  const configPath = join(projectPath, 'project.godot')

  // ⚡ Bolt: Using replaceAll('\\', '/') avoids RegExp allocation overhead
  const resPath = `res://${scenePath.replaceAll('\\', '/')}`

  let content: string
  try {
    content = await readFile(configPath, 'utf-8')
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new GodotMCPError('No project.godot found', 'PROJECT_NOT_FOUND', 'Verify the project path.')
    }
    throw error
  }

  const updated = setSettingInContent(content, 'application/run/main_scene', `"${resPath}"`)
  await writeFile(configPath, updated, 'utf-8')

  return formatSuccess(`Set main scene: ${resPath}`)
}

const SCENE_ACTIONS: Record<
  string,
  (
    projectPath: string,
    args: Record<string, unknown>,
  ) => Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }>
> = {
  create: handleCreate,
  list: (projectPath) => handleList(projectPath),
  info: handleInfo,
  delete: handleDelete,
  duplicate: handleDuplicate,
  set_main: handleSetMain,
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

  return { projectPath: projectPath as string, scenePath, newPath }
}

export async function handleScenes(action: string, args: Record<string, unknown>, config: GodotConfig) {
  const { projectPath } = validateSceneArgs(action, args, config)

  const handler = SCENE_ACTIONS[action]
  if (handler) {
    return handler(projectPath, args)
  }

  throwUnknownAction(action, Object.keys(SCENE_ACTIONS))
}
