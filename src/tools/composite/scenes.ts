/**
 * Scenes tool - Scene file management
 * Actions: create | list | info | delete | duplicate | set_main
 */

import { copyFile, mkdir, readdir, readFile, unlink, writeFile } from 'node:fs/promises'
import { basename, dirname, join } from 'node:path'
import type { GodotConfig, SceneInfo } from '../../godot/types.js'
import { formatJSON, formatSuccess, GodotMCPError, throwUnknownAction } from '../helpers/errors.js'
import { pathExists, safeResolve } from '../helpers/paths.js'
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

async function handleCreateScene(projectPath: string, args: Record<string, unknown>) {
  const scenePath = args.scene_path as string
  if (!scenePath) {
    throw new GodotMCPError('No scene_path specified', 'INVALID_ARGS', 'Provide scene_path (e.g., "scenes/main.tscn").')
  }

  const rootType = (args.root_type as string) || 'Node2D'
  const rootName = (args.root_name as string) || basename(scenePath, '.tscn')

  if (rootName.includes('"') || rootName.includes('\n') || rootName.includes('\r')) {
    throw new GodotMCPError('Invalid root name', 'INVALID_ARGS', 'Root name must not contain quotes or newlines.')
  }

  if (rootType.includes('"') || rootType.includes('\n') || rootType.includes('\r')) {
    throw new GodotMCPError('Invalid root type', 'INVALID_ARGS', 'Root type must not contain quotes or newlines.')
  }

  const fullPath = safeResolve(projectPath, scenePath)
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

async function handleListScenesAction(projectPath: string, _args: Record<string, unknown>) {
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

async function handleInfoScene(projectPath: string, args: Record<string, unknown>) {
  const scenePath = args.scene_path as string
  if (!scenePath) {
    throw new GodotMCPError('No scene_path specified', 'INVALID_ARGS', 'Provide scene_path to parse.')
  }

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

async function handleDeleteScene(projectPath: string, args: Record<string, unknown>) {
  const scenePath = args.scene_path as string
  if (!scenePath) {
    throw new GodotMCPError('No scene_path specified', 'INVALID_ARGS', 'Provide scene_path to delete.')
  }

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

async function handleDuplicateScene(projectPath: string, args: Record<string, unknown>) {
  const scenePath = args.scene_path as string
  const newPath = args.new_path as string

  if (!scenePath || !newPath) {
    throw new GodotMCPError(
      'Both scene_path and new_path required',
      'INVALID_ARGS',
      'Provide source and destination paths.',
    )
  }

  const srcFull = safeResolve(projectPath, scenePath)
  const dstFull = safeResolve(projectPath, newPath)

  if (await pathExists(dstFull)) {
    throw new GodotMCPError(`Destination already exists: ${newPath}`, 'SCENE_ERROR', 'Choose a different destination.')
  }

  await mkdir(dirname(dstFull), { recursive: true })
  try {
    await copyFile(srcFull, dstFull)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new GodotMCPError(`Source scene not found: ${scenePath}`, 'SCENE_ERROR', 'Check the source path.')
    }
    throw error
  }
  return formatSuccess(`Duplicated: ${scenePath} -> ${newPath}`)
}

async function handleSetMainScene(projectPath: string, args: Record<string, unknown>) {
  const scenePath = args.scene_path as string
  if (!scenePath) {
    throw new GodotMCPError('No scene_path specified', 'INVALID_ARGS', 'Provide scene_path to set as main.')
  }

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
    config: GodotConfig,
  ) => Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }>
> = {
  create: (pp, args) => handleCreateScene(pp, args),
  list: (pp, args) => handleListScenesAction(pp, args),
  info: (pp, args) => handleInfoScene(pp, args),
  delete: (pp, args) => handleDeleteScene(pp, args),
  duplicate: (pp, args) => handleDuplicateScene(pp, args),
  set_main: (pp, args) => handleSetMainScene(pp, args),
}

export async function handleScenes(action: string, args: Record<string, unknown>, config: GodotConfig) {
  const baseProjectPath = config.projectPath || process.cwd()
  const projectPath = args.project_path
    ? safeResolve(baseProjectPath, args.project_path as string)
    : config.projectPath || undefined

  if (['create', 'list', 'set_main'].includes(action) && !projectPath) {
    throw new GodotMCPError('No project path specified', 'INVALID_ARGS', 'Provide project_path argument.')
  }

  const resolvedProjectPath = projectPath || baseProjectPath

  const handler = SCENE_ACTIONS[action]
  if (handler) {
    return handler(resolvedProjectPath, args, config)
  }

  throwUnknownAction(action, Object.keys(SCENE_ACTIONS))
}
