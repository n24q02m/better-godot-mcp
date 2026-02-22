import { isAbsolute, relative, resolve } from 'node:path'
import { GodotMCPError } from './errors.js'

/**
 * Safely resolves a path ensuring it remains within the base directory.
 * @param basePath The base directory (e.g., project root)
 * @param userPath The user-provided path (can be relative or absolute)
 * @returns The resolved absolute path
 * @throws GodotMCPError if the path traverses outside the base directory
 */
export function safeResolve(basePath: string, userPath: string): string {
  const resolvedBase = resolve(basePath)
  const resolvedPath = resolve(resolvedBase, userPath)

  const rel = relative(resolvedBase, resolvedPath)

  // Check if path is outside base (starts with '..') or is absolute but different root (on Windows)
  if (rel.startsWith('..') || isAbsolute(rel)) {
    throw new GodotMCPError(
      `Access denied: Path traversal detected. '${userPath}' is outside the project root.`,
      'ACCESS_DENIED',
      'Ensure all paths are within the project directory.',
    )
  }

  return resolvedPath
}
