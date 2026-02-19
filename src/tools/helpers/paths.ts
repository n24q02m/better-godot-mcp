import { isAbsolute, relative, resolve, sep } from 'node:path'
import { GodotMCPError } from './errors.js'

/**
 * Safely resolves a path relative to a base directory, ensuring it doesn't escape the base.
 *
 * @param basePath The base directory (e.g., project root)
 * @param targetPath The path to resolve (can be relative or absolute)
 * @returns The resolved absolute path
 * @throws GodotMCPError if the path attempts to traverse outside the base directory
 */
export function safeResolve(basePath: string, targetPath: string): string {
  const resolvedBase = resolve(basePath)
  const resolvedTarget = resolve(resolvedBase, targetPath)
  const rel = relative(resolvedBase, resolvedTarget)

  // Check if path is outside (starts with ..) or is absolute on different drive (win32)
  if ((rel.startsWith('..') && (rel === '..' || rel.startsWith(`..${sep}`))) || isAbsolute(rel)) {
    throw new GodotMCPError(
      `Access denied: Path '${targetPath}' resolves to '${resolvedTarget}', which is outside the project root '${resolvedBase}'`,
      'ACCESS_DENIED',
      'Ensure the path is within the project directory.',
    )
  }

  return resolvedTarget
}
