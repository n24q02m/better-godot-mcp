import { isAbsolute, relative, resolve } from 'node:path'
import { GodotMCPError } from './errors.js'

/**
 * Safely resolves a path ensuring it is within the base directory.
 * Throws GodotMCPError if access is denied.
 *
 * @param basePath The base directory (project root)
 * @param targetPath The relative or absolute path to resolve
 * @returns The resolved absolute path
 */
export function safeResolve(basePath: string, targetPath: string): string {
  const resolvedBase = resolve(basePath)
  const resolvedPath = resolve(resolvedBase, targetPath)

  const rel = relative(resolvedBase, resolvedPath)

  if (rel.startsWith('..') || isAbsolute(rel)) {
    throw new GodotMCPError(
      `Access denied: ${targetPath} resolves outside of project directory`,
      'ACCESS_DENIED',
      'Path traversal detected. Ensure all paths are within the project directory.',
    )
  }

  return resolvedPath
}
