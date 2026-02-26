import { isAbsolute, relative, resolve } from 'node:path'
import { GodotMCPError } from './errors.js'

/**
 * Safely resolves a path ensuring it remains within the project root.
 * Throws ACCESS_DENIED if the path attempts to traverse outside.
 *
 * @param basePath - The root directory (e.g., project path)
 * @param relativePath - The path to resolve relative to root
 * @returns The absolute resolved path
 */
export function safeResolve(basePath: string, relativePath: string): string {
  const resolvedBase = resolve(basePath)
  const resolvedPath = resolve(resolvedBase, relativePath)

  // Ensure the path is within the base path
  // We use relative() to check if it starts with '..'
  const rel = relative(resolvedBase, resolvedPath)

  if (rel.startsWith('..') || isAbsolute(rel)) {
    throw new GodotMCPError(
      `Access denied: Path '${relativePath}' is outside the project root.`,
      'ACCESS_DENIED',
      'Ensure all paths are within the project directory.',
    )
  }

  return resolvedPath
}
