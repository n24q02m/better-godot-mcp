import { resolve, sep } from 'node:path'
import { GodotMCPError } from './errors.js'

/**
 * Safely resolves a path relative to a base directory, preventing path traversal.
 *
 * @param basePath - The base directory to resolve against.
 * @param relativePath - The path to resolve.
 * @returns The resolved absolute path.
 * @throws {GodotMCPError} If the resolved path is outside the base directory.
 */
export function safeResolve(basePath: string, relativePath: string): string {
  const resolvedBase = resolve(basePath)
  const resolvedPath = resolve(resolvedBase, relativePath)

  // Ensure the resolved path starts with the base path
  // Handle case where base path is root or has trailing separator
  const baseWithSep = resolvedBase.endsWith(sep) ? resolvedBase : resolvedBase + sep

  if (resolvedPath !== resolvedBase && !resolvedPath.startsWith(baseWithSep)) {
    throw new GodotMCPError(
      `Path traversal detected: ${relativePath}`,
      'INVALID_ARGS',
      'Ensure the path is within the project directory.',
    )
  }

  return resolvedPath
}
