import { isAbsolute, relative, resolve } from 'node:path'
import { GodotMCPError } from './errors.js'

/**
 * Safely resolves a path relative to a base directory, ensuring it stays within the base.
 * @param basePath The base directory to resolve against.
 * @param targetPath The path to resolve (relative or absolute).
 * @returns The absolute resolved path.
 * @throws GodotMCPError if the resolved path is outside the base directory.
 */
export function safeResolve(basePath: string, targetPath: string): string {
  const resolvedBase = resolve(basePath)
  const resolvedTarget = resolve(resolvedBase, targetPath)
  const rel = relative(resolvedBase, resolvedTarget)

  // specific check for ".." is needed because relative() might return ".." or "../something"
  if (rel.startsWith('..') || isAbsolute(rel)) {
    throw new GodotMCPError(
      `Path traversal detected: ${targetPath} resolves to ${resolvedTarget} which is outside of ${basePath}`,
      'INVALID_ARGS',
      'Ensure the path is within the project directory.'
    )
  }

  return resolvedTarget
}
