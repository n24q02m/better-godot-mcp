import { resolve, sep } from 'node:path'
import { GodotMCPError } from './errors.js'

/**
 * Safely resolves a path relative to a base path, preventing directory traversal.
 *
 * @param basePath The trusted base directory (e.g. project root)
 * @param relativePath The user-provided path to resolve
 * @returns The absolute resolved path
 * @throws GodotMCPError if the path traverses outside the base path
 */
export function safeResolve(basePath: string, relativePath: string): string {
  const resolvedBase = resolve(basePath)
  const resolvedPath = resolve(resolvedBase, relativePath)

  // Ensure the resolved path starts with the base path
  // We append a separator to ensure we don't match partial folder names (e.g. /var/www vs /var/www-fake)
  // But we also allow the path to be exactly the base path
  const baseWithSep = resolvedBase.endsWith(sep) ? resolvedBase : resolvedBase + sep
  const pathWithSep = resolvedPath.endsWith(sep) ? resolvedPath : resolvedPath + sep

  if (resolvedPath !== resolvedBase && !pathWithSep.startsWith(baseWithSep)) {
    throw new GodotMCPError(
      `Path traversal detected: ${relativePath}`,
      'INVALID_ARGS',
      'Path must be within project directory.',
    )
  }

  return resolvedPath
}
