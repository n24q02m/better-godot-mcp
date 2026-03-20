/**
 * Resources tool - Resource file management
 * Actions: list | info | delete | import_config
 */

import { readdir, readFile, stat, unlink } from 'node:fs/promises'
import { extname, join, relative, sep } from 'node:path'
import type { GodotConfig } from '../../godot/types.js'
import { formatJSON, formatSuccess, GodotMCPError, throwUnknownAction } from '../helpers/errors.js'
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

async function findResourceFiles(dir: string, extensions?: Set<string>): Promise<ResourceEntry[]> {
  const exts = extensions || RESOURCE_EXTENSIONS
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    const promises = entries.map(async (entry) => {
      const name = entry.name
      if (name.startsWith('.') || name === 'node_modules' || name === 'build') return []

      const fullPath = join(dir, name)
      if (entry.isDirectory()) {
        return findResourceFiles(fullPath, exts)
      } else if (exts.has(extname(name).toLowerCase())) {
        try {
          const fileStat = await stat(fullPath)
          return [{ path: fullPath, size: fileStat.size }]
        } catch {
          return []
        }
      }
      return []
    })

    const results = await Promise.all(promises)
    return results.flat()
  } catch {
    // Skip inaccessible
    return []
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

      const resourcesLength = resources.length
      const relativePaths = new Array(resourcesLength)
      const prefixLen = resolvedPath.length + 1 // including separator

      for (let i = 0; i < resourcesLength; i++) {
        const r = resources[i]
        const p = r.path

        // Fast path for relative path creation
        let relPath: string
        if (p.startsWith(resolvedPath) && (p.length === resolvedPath.length || p[resolvedPath.length] === sep)) {
          relPath = p.length === resolvedPath.length ? '' : p.substring(prefixLen)
          if (sep === '\\') {
            relPath = relPath.replace(/\\/g, '/')
          }
        } else {
          relPath = relative(resolvedPath, p).replace(/\\/g, '/')
        }

        // Fast extname
        const dotIndex = p.lastIndexOf('.')
        const slashIndex = p.lastIndexOf(sep)
        const ext = dotIndex > slashIndex && dotIndex !== -1 ? p.substring(dotIndex) : ''

        relativePaths[i] = {
          path: relPath,
          ext,
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
