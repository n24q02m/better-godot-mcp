import { isAbsolute, relative, resolve } from 'node:path'
import { GodotMCPError } from './errors.js'

/**
 * Safely resolves a path ensuring it stays within the base directory.
 * Throws a GodotMCPError if the path attempts to traverse outside.
 */
export function safeResolve(basePath: string, userPath: string): string {
  const resolvedBase = resolve(basePath)
  const resolvedPath = resolve(resolvedBase, userPath)

  const rel = relative(resolvedBase, resolvedPath)
  const isChild = rel && !rel.startsWith('..') && !isAbsolute(rel)

  // relative returns '' if paths are equal, so we check for that explicitly
  if (!isChild && rel !== '') {
    throw new GodotMCPError(
      `Access denied: Path '${userPath}' resolves outside project directory`,
      'ACCESS_DENIED',
      'Ensure all paths are within the project root.',
    )
  }

  return resolvedPath
}
