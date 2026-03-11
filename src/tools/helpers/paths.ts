import { isAbsolute, normalize, relative, resolve, sep } from 'node:path'
import { GodotMCPError } from './errors.js'

/**
 * Safely resolves a path relative to a base directory, preventing path traversal.
 *
 * @param baseDir The trusted base directory (e.g. project root)
 * @param targetPath The untrusted path provided by user
 * @returns The resolved absolute path
 * @throws GodotMCPError if the path attempts to traverse outside the base directory
 */
export function safeResolve(baseDir: string, targetPath: string): string {
  // Normalize paths to remove .. and .
  const resolvedBase = resolve(baseDir)
  const resolvedTarget = resolve(resolvedBase, targetPath)

  // Calculate relative path from base to target
  const relativePath = relative(resolvedBase, resolvedTarget)

  // Check if path is outside base directory
  const baseWithSep = resolvedBase.endsWith(sep) ? resolvedBase : resolvedBase + sep

  // If base is root, resolve() strips '..' so we must also check the normalized targetPath
  const isRootBypass = resolvedBase === resolve('/') && normalize(targetPath).startsWith('..')

  if (
    (!resolvedTarget.startsWith(baseWithSep) && resolvedTarget !== resolvedBase) ||
    relativePath.startsWith('..') ||
    isAbsolute(relativePath) ||
    isRootBypass
  ) {
    throw new GodotMCPError(
      `Access denied: Path '${targetPath}' resolves to '${resolvedTarget}' which is outside the project root '${resolvedBase}'.`,
      'INVALID_ARGS',
      'Ensure all file paths are within the project directory.',
    )
  }

  return resolvedTarget
}
