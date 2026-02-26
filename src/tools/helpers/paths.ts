import { isAbsolute, relative, resolve } from 'node:path'
import { GodotMCPError } from './errors.js'

/**
 * Safely resolves a path relative to a base directory.
 * Throws an ACCESS_DENIED error if the resolved path is outside the base directory.
 *
 * @param base - The base directory (e.g., project root)
 * @param target - The target path relative to the base
 * @returns The resolved absolute path
 */
export function safeResolve(base: string, target: string): string {
  const resolvedBase = resolve(base)
  const resolvedTarget = resolve(resolvedBase, target)
  const rel = relative(resolvedBase, resolvedTarget)

  // Check if path traverses up (starts with ..) or is absolute (different drive on Windows)
  if (rel.startsWith('..') || isAbsolute(rel)) {
    throw new GodotMCPError(
      `Access denied: Path '${target}' resolves to '${resolvedTarget}' which is outside the project root '${resolvedBase}'`,
      'ACCESS_DENIED',
      'Ensure all paths are within the project directory.',
    )
  }

  return resolvedTarget
}
