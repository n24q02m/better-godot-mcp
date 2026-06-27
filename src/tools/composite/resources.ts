/**
 * Resources tool - Resource file management
 * Actions: list | info | delete | import_config
 */

import { readdir, readFile, stat, unlink } from 'node:fs/promises'
import { extname, join } from 'node:path'
import type { GodotConfig } from '../../godot/types.js'
import { formatJSON, formatSuccess, GodotMCPError, throwUnknownAction } from '../helpers/errors.js'
import { resolveProjectRoot, safeResolve } from '../helpers/paths.js'

const TYPE_REGEX = /type="([^"]*)"/
const PATH_REGEX = /path="([^"]*)"/

const RESOURCE_EXTENSIONS = new Set([
  '.tres',
  '.res',
  '.tscn',
  '.png',
  '.jpg',
  '.jpeg',
  '.svg',
  '.webp',
  '.wav',
  '.ogg',
  '.mp3',
  '.ttf',
  '.otf',
  '.gdshader',
  '.gdshaderinc',
  '.import',
])

interface ResourceEntry {
  path: string
  size: number
}

async function findResourceFiles(
  dir: string,
  extensions?: Set<string>,
  results: ResourceEntry[] = [],
): Promise<ResourceEntry[]> {
  const exts = extensions || RESOURCE_EXTENSIONS
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    const promises: Promise<void>[] = []

    for (let i = 0; i < entries.length; i++) {
      const entry = entries[i]
      const name = entry.name
      if (name.startsWith('.') || name === 'node_modules' || name === 'build') continue

      const fullPath = join(dir, name)
      if (entry.isDirectory()) {
        promises.push(findResourceFiles(fullPath, exts, results).then(() => {}))
      } else if (name.includes('.') && exts.has(name.slice(name.lastIndexOf('.')).toLowerCase())) {
        promises.push(
          stat(fullPath)
            .then((fileStat) => {
              results.push({ path: fullPath, size: fileStat.size })
            })
            .catch(() => {}),
        )
      }
    }

    if (promises.length > 0) {
      await Promise.all(promises)
    }
    return results
  } catch {
    // Skip inaccessible
    return results
  }
}

async function handleListResources(projectRoot: string, args: Record<string, unknown>) {
  const filterType = args.type as string | undefined
  let exts: Set<string> | undefined
  if (filterType) {
    const typeMap: Record<string, string[]> = {
      image: ['.png', '.jpg', '.jpeg', '.svg', '.webp'],
      audio: ['.wav', '.ogg', '.mp3'],
      font: ['.ttf', '.otf'],
      shader: ['.gdshader', '.gdshaderinc'],
      scene: ['.tscn'],
      resource: ['.tres', '.res'],
    }
    if (typeMap[filterType]) exts = new Set(typeMap[filterType])
  }

  const resources = await findResourceFiles(projectRoot, exts)

  const prefixLen = projectRoot.length + (projectRoot.endsWith('/') || projectRoot.endsWith('\\') ? 0 : 1)
  const relativePaths = new Array(resources.length)
  for (let i = 0; i < resources.length; i++) {
    const r = resources[i]
    relativePaths[i] = {
      path: r.path.substring(prefixLen).replaceAll('\\', '/'),
      ext: extname(r.path),
      size: r.size,
    }
  }

  return formatJSON({ project: projectRoot, count: relativePaths.length, resources: relativePaths })
}

async function handleResourceInfo(projectRoot: string, args: Record<string, unknown>) {
  const resPath = args.resource_path as string
  if (!resPath) throw new GodotMCPError('No resource_path specified', 'INVALID_ARGS', 'Provide resource_path.')
  const fullPath = safeResolve(projectRoot, resPath)

  try {
    const fileStat = await stat(fullPath)
    const ext = extname(fullPath)
    const info: Record<string, unknown> = {
      path: resPath,
      extension: ext,
      size: fileStat.size,
      modified: fileStat.mtime.toISOString(),
    }

    if (ext === '.tres' || ext === '.import') {
      const content = await readFile(fullPath, 'utf-8')
      const typeMatch = TYPE_REGEX.exec(content)
      if (typeMatch) info.type = typeMatch[1]
      const pathMatch = PATH_REGEX.exec(content)
      if (pathMatch) info.importPath = pathMatch[1]
    }

    return formatJSON(info)
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new GodotMCPError(`Resource not found: ${resPath}`, 'RESOURCE_ERROR', 'Check the file path.')
    }
    throw err
  }
}

async function handleDeleteResource(projectRoot: string, args: Record<string, unknown>) {
  const resPath = args.resource_path as string
  if (!resPath) throw new GodotMCPError('No resource_path specified', 'INVALID_ARGS', 'Provide resource_path.')
  const fullPath = safeResolve(projectRoot, resPath)

  try {
    await unlink(fullPath)
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      throw new GodotMCPError(`Resource not found: ${resPath}`, 'RESOURCE_ERROR', 'Check the file path.')
    }
    throw err
  }

  try {
    await unlink(`${fullPath}.import`)
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== 'ENOENT') throw err
  }

  return formatSuccess(`Deleted resource: ${resPath}`)
}

async function handleImportConfig(projectRoot: string, args: Record<string, unknown>) {
  const resPath = args.resource_path as string
  if (!resPath) throw new GodotMCPError('No resource_path specified', 'INVALID_ARGS', 'Provide resource_path.')

  const importPath = safeResolve(projectRoot, `${resPath}.import`)

  try {
    const content = await readFile(importPath, 'utf-8')
    return formatSuccess(`Import config for ${resPath}:\n\n${content}`)
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      return formatJSON({ path: resPath, imported: false, message: 'No .import file found.' })
    }
    throw err
  }
}

const RESOURCE_ACTIONS: Record<
  string,
  (
    projectRoot: string,
    args: Record<string, unknown>,
  ) => Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }>
> = {
  list: handleListResources,
  info: handleResourceInfo,
  delete: handleDeleteResource,
  import_config: handleImportConfig,
}

export async function handleResources(action: string, args: Record<string, unknown>, config: GodotConfig) {
  const projectRoot = resolveProjectRoot(args.project_path, config.projectPath)

  if (action === 'list' && !args.project_path && !config.projectPath) {
    throw new GodotMCPError('No project path specified', 'INVALID_ARGS', 'Provide project_path.')
  }

  if (Object.hasOwn(RESOURCE_ACTIONS, action)) {
    const handler = RESOURCE_ACTIONS[action]
    if (handler) {
      return handler(projectRoot, args)
    }
  }

  throwUnknownAction(action, Object.keys(RESOURCE_ACTIONS))
}
