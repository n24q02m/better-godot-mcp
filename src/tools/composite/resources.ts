/**
 * Resources tool - Resource file management
 * Actions: list | info | delete | import_config
 */

import { readdir, readFile, stat, unlink } from 'node:fs/promises'
import { extname, join } from 'node:path'
import type { GodotConfig } from '../../godot/types.js'
import { formatJSON, formatSuccess, GodotMCPError, throwUnknownAction } from '../helpers/errors.js'
const BACKSLASH_RE = /\\/g
import { pathExists, safeResolve } from '../helpers/paths.js'

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

    // ⚡ Bolt: Removed .map() and .flat() in favor of a shared results array and .push()
    // This reduces intermediate array allocations and garbage collection pressure
    // during recursive asynchronous directory traversals for Godot projects with many assets.

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

export async function handleResources(action: string, args: Record<string, unknown>, config: GodotConfig) {
  const projectPath = (args.project_path as string) || config.projectPath
  const baseDir = config.projectPath || process.cwd()

  switch (action) {
    case 'list': {
      if (!projectPath) throw new GodotMCPError('No project path specified', 'INVALID_ARGS', 'Provide project_path.')
      const resolvedPath = safeResolve(baseDir, projectPath)
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

      const resources = await findResourceFiles(resolvedPath, exts)

      // OPTIMIZATION: Use substring and a pre-allocated array instead of .map() and node:path.relative
      // for significantly faster execution on large arrays of prefixed paths.
      const prefixLen = resolvedPath.length + (resolvedPath.endsWith('/') || resolvedPath.endsWith('\\') ? 0 : 1)
      const relativePaths = new Array(resources.length)
      for (let i = 0; i < resources.length; i++) {
        const r = resources[i]
        relativePaths[i] = {
          path: r.path.substring(prefixLen).replace(BACKSLASH_RE, '/'),
          ext: extname(r.path),
          size: r.size,
        }
      }

      return formatJSON({ project: resolvedPath, count: relativePaths.length, resources: relativePaths })
    }

    case 'info': {
      const resPath = args.resource_path as string
      if (!resPath) throw new GodotMCPError('No resource_path specified', 'INVALID_ARGS', 'Provide resource_path.')
      const fullPath = safeResolve(projectPath || process.cwd(), resPath)
      if (!(await pathExists(fullPath)))
        throw new GodotMCPError(`Resource not found: ${resPath}`, 'RESOURCE_ERROR', 'Check the file path.')

      const fileStat = await stat(fullPath)
      const ext = extname(fullPath)
      const info: Record<string, unknown> = {
        path: resPath,
        extension: ext,
        size: fileStat.size,
        modified: fileStat.mtime.toISOString(),
      }

      // Parse .tres/.import files for metadata
      if (ext === '.tres' || ext === '.import') {
        const content = await readFile(fullPath, 'utf-8')
        const typeMatch = content.match(/type="([^"]*)"/)
        if (typeMatch) info.type = typeMatch[1]
        const pathMatch = content.match(/path="([^"]*)"/)
        if (pathMatch) info.importPath = pathMatch[1]
      }

      return formatJSON(info)
    }

    case 'delete': {
      const resPath = args.resource_path as string
      if (!resPath) throw new GodotMCPError('No resource_path specified', 'INVALID_ARGS', 'Provide resource_path.')
      const fullPath = safeResolve(projectPath || process.cwd(), resPath)
      if (!(await pathExists(fullPath)))
        throw new GodotMCPError(`Resource not found: ${resPath}`, 'RESOURCE_ERROR', 'Check the file path.')

      await unlink(fullPath)
      // Also delete .import file if exists
      const importFile = `${fullPath}.import`
      if (await pathExists(importFile)) await unlink(importFile)

      return formatSuccess(`Deleted resource: ${resPath}`)
    }

    case 'import_config': {
      const resPath = args.resource_path as string
      if (!resPath) throw new GodotMCPError('No resource_path specified', 'INVALID_ARGS', 'Provide resource_path.')

      const importPath = safeResolve(projectPath || process.cwd(), `${resPath}.import`)

      if (!(await pathExists(importPath))) {
        return formatJSON({ path: resPath, imported: false, message: 'No .import file found.' })
      }

      const content = await readFile(importPath, 'utf-8')
      return formatSuccess(`Import config for ${resPath}:\n\n${content}`)
    }

    default:
      throwUnknownAction(action, ['list', 'info', 'delete', 'import_config'])
  }
}
