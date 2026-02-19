import { resolve, sep } from 'node:path'
import { GodotMCPError } from './errors.js'

/**
 * Resolves a path relative to a base directory and ensures it is contained within the base.
 * @param basePath The base directory to resolve against (e.g., project root)
 * @param relativePath The relative path to resolve
 * @returns The resolved absolute path
 * @throws GodotMCPError if the resolved path is outside the base directory
 */
export function safeResolve(basePath: string, relativePath: string): string {
  const resolvedBase = resolve(basePath)
  const resolvedPath = resolve(resolvedBase, relativePath)

  // Ensure resolvedPath starts with resolvedBase followed by a separator,
  // or is exactly resolvedBase (e.g. resolving '.')
  if (resolvedPath !== resolvedBase && !resolvedPath.startsWith(resolvedBase + sep)) {
    throw new GodotMCPError(
      `Path traversal detected: ${relativePath}`,
      'SECURITY_VIOLATION',
      'Access to files outside the project directory is not allowed.',
    )
  }

  return resolvedPath
}
