/**
 * Resources tool - Resource file management
 * Actions: list | info | delete | import_config
 */

import { existsSync, readFileSync, statSync, unlinkSync } from 'node:fs'
import { extname, relative, resolve } from 'node:path'
import type { GodotConfig } from '../../godot/types.js'
import { formatJSON, formatSuccess, GodotMCPError } from '../helpers/errors.js'
import { findFiles } from '../helpers/files.js'

const RESOURCE_EXTENSIONS = new Set([
  '.tres',
  '.res',
  '.tscn',
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

      const resources = await findFiles(resolvedPath, exts || RESOURCE_EXTENSIONS)
      const relativePaths = resources.map((r) => ({
        path: relative(resolvedPath, r).replace(/\\/g, '/'),
        ext: extname(r),
        size: statSync(r).size,
      }))

      return formatJSON({ project: resolvedPath, count: relativePaths.length, resources: relativePaths })
    }

    case 'info': {
      const resPath = args.resource_path as string
      if (!resPath) throw new GodotMCPError('No resource_path specified', 'INVALID_ARGS', 'Provide resource_path.')
      const fullPath = projectPath ? resolve(projectPath, resPath) : resolve(resPath)
      if (!existsSync(fullPath))
        throw new GodotMCPError(`Resource not found: ${resPath}`, 'RESOURCE_ERROR', 'Check the file path.')

      const stat = statSync(fullPath)
      const ext = extname(fullPath)
      const info: Record<string, unknown> = {
        path: resPath,
        extension: ext,
        size: stat.size,
        modified: stat.mtime.toISOString(),
      }

      // Parse .tres/.import files for metadata
      if (ext === '.tres' || ext === '.import') {
        const content = readFileSync(fullPath, 'utf-8')
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
      const fullPath = projectPath ? resolve(projectPath, resPath) : resolve(resPath)
      if (!existsSync(fullPath))
        throw new GodotMCPError(`Resource not found: ${resPath}`, 'RESOURCE_ERROR', 'Check the file path.')

      unlinkSync(fullPath)
      // Also delete .import file if exists
      const importFile = `${fullPath}.import`
      if (existsSync(importFile)) unlinkSync(importFile)

      return formatSuccess(`Deleted resource: ${resPath}`)
    }

    case 'import_config': {
      const resPath = args.resource_path as string
      if (!resPath) throw new GodotMCPError('No resource_path specified', 'INVALID_ARGS', 'Provide resource_path.')

      const importPath = projectPath ? resolve(projectPath, `${resPath}.import`) : resolve(`${resPath}.import`)

      if (!existsSync(importPath)) {
        return formatJSON({ path: resPath, imported: false, message: 'No .import file found.' })
      }

      const content = readFileSync(importPath, 'utf-8')
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
