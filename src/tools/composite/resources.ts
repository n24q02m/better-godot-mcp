/**
 * Resources tool - Resource file management
 * Actions: list | info | delete | import_config
 */

import { existsSync } from 'node:fs'
import { readdir, readFile, stat, unlink } from 'node:fs/promises'
import { extname, join, relative, resolve } from 'node:path'
import type { GodotConfig } from '../../godot/types.js'
import { formatJSON, formatSuccess, GodotMCPError } from '../helpers/errors.js'

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

interface ResourceInfo {
  path: string
  size: number
}

async function findResourceFiles(dir: string, extensions?: Set<string>): Promise<ResourceInfo[]> {
  const exts = extensions || RESOURCE_EXTENSIONS
  const results: ResourceInfo[] = []

  try {
    const entries = await readdir(dir, { withFileTypes: true })
    const promises: Promise<ResourceInfo | ResourceInfo[] | null>[] = []

    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules' || entry.name === 'build') continue
      const fullPath = join(dir, entry.name)

      if (entry.isDirectory()) {
        promises.push(findResourceFiles(fullPath, exts))
      } else if (entry.isFile() && exts.has(extname(entry.name).toLowerCase())) {
        promises.push(
          stat(fullPath)
            .then((s) => ({ path: fullPath, size: s.size }))
            .catch(() => null),
        )
      }
    }

    const resolved = await Promise.all(promises)
    for (const item of resolved) {
      if (!item) continue
      if (Array.isArray(item)) {
        results.push(...item)
      } else {
        results.push(item)
      }
    }
  } catch {
    // Skip inaccessible
  }
  return results
}

export async function handleResources(action: string, args: Record<string, unknown>, config: GodotConfig) {
  const projectPath = (args.project_path as string) || config.projectPath

  switch (action) {
    case 'list': {
      if (!projectPath) throw new GodotMCPError('No project path specified', 'INVALID_ARGS', 'Provide project_path.')
      const resolvedPath = resolve(projectPath)
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
      const relativePaths = resources.map((r) => ({
        path: relative(resolvedPath, r.path).replace(/\\/g, '/'),
        ext: extname(r.path),
        size: r.size,
      }))

      return formatJSON({ project: resolvedPath, count: relativePaths.length, resources: relativePaths })
    }

    case 'info': {
      const resPath = args.resource_path as string
      if (!resPath) throw new GodotMCPError('No resource_path specified', 'INVALID_ARGS', 'Provide resource_path.')
      const fullPath = projectPath ? resolve(projectPath, resPath) : resolve(resPath)

      try {
        const stats = await stat(fullPath)
        const ext = extname(fullPath)
        const info: Record<string, unknown> = {
          path: resPath,
          extension: ext,
          size: stats.size,
          modified: stats.mtime.toISOString(),
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
      } catch (err: unknown) {
        if (err && typeof err === 'object' && 'code' in err && (err as { code: string }).code === 'ENOENT') {
          throw new GodotMCPError(`Resource not found: ${resPath}`, 'RESOURCE_ERROR', 'Check the file path.')
        }
        throw err
      }
    }

    case 'delete': {
      const resPath = args.resource_path as string
      if (!resPath) throw new GodotMCPError('No resource_path specified', 'INVALID_ARGS', 'Provide resource_path.')
      const fullPath = projectPath ? resolve(projectPath, resPath) : resolve(resPath)

      if (!existsSync(fullPath))
        throw new GodotMCPError(`Resource not found: ${resPath}`, 'RESOURCE_ERROR', 'Check the file path.')

      await unlink(fullPath)
      // Also delete .import file if exists
      const importFile = `${fullPath}.import`
      if (existsSync(importFile)) await unlink(importFile)

      return formatSuccess(`Deleted resource: ${resPath}`)
    }

    case 'import_config': {
      const resPath = args.resource_path as string
      if (!resPath) throw new GodotMCPError('No resource_path specified', 'INVALID_ARGS', 'Provide resource_path.')

      const importPath = projectPath ? resolve(projectPath, `${resPath}.import`) : resolve(`${resPath}.import`)

      if (!existsSync(importPath)) {
        return formatJSON({ path: resPath, imported: false, message: 'No .import file found.' })
      }

      const content = await readFile(importPath, 'utf-8')
      return formatSuccess(`Import config for ${resPath}:\n\n${content}`)
    }

    default:
      throw new GodotMCPError(
        `Unknown action: ${action}`,
        'INVALID_ACTION',
        'Valid actions: list, info, delete, import_config. Use help tool for full docs.',
      )
  }
}
