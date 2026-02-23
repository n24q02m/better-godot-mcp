import { isAbsolute, relative, resolve } from 'node:path'
import { GodotMCPError } from './errors.js'

/**
 * Safely resolves a path relative to a base directory (project root).
 * Throws if the resolved path is outside the base directory.
 *
 * @param basePath - The root directory to confine access to (e.g., project path)
 * @param userPath - The path provided by the user (relative or absolute)
 * @returns The resolved absolute path
 * @throws GodotMCPError if access is denied
 */
export function safeResolve(basePath: string, userPath: string): string {
  const resolvedBase = resolve(basePath)
  const resolvedPath = resolve(resolvedBase, userPath)
  const rel = relative(resolvedBase, resolvedPath)

  // specific check for .. at the start or if it's an absolute path on a different drive (Windows)
  if (rel.startsWith('..') || isAbsolute(rel)) {
    throw new GodotMCPError(
      `Access denied: Path '${userPath}' resolves outside the project directory`,
      'ACCESS_DENIED',
      'Ensure all paths are relative to the project root and do not use parent directory references (..).',
      { resolvedPath, basePath: resolvedBase },
    )
  }

  return resolvedPath
}
