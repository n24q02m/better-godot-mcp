import { isAbsolute, relative, resolve } from 'node:path'
import { GodotMCPError } from './errors.js'

/**
 * Safely resolves a path relative to a base directory, preventing directory traversal.
 * @param basePath The trusted base directory (e.g. project root)
 * @param relativePath The path provided by the user (potentially malicious)
 * @returns The resolved absolute path
 * @throws GodotMCPError if the resolved path is outside the base directory
 */
export function safeResolve(basePath: string, relativePath: string): string {
  const resolved = resolve(basePath, relativePath)
  const rel = relative(basePath, resolved)

  // Check for path traversal (starts with ..) or absolute path pointing outside
  if (rel.startsWith('..') || isAbsolute(rel)) {
    throw new GodotMCPError(
      `Access denied: Path traversal detected. "${relativePath}" resolves outside the project root.`,
      'ACCESS_DENIED',
      'Ensure the path is within the project directory.',
    )
  }

  return resolved
}
