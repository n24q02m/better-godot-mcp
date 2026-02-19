import { isAbsolute, relative, resolve } from 'node:path'
import { GodotMCPError } from './errors.js'

/**
 * Safely resolves a path ensuring it stays within the base directory.
 * Prevents path traversal attacks.
 *
 * @param basePath - The base directory to resolve against.
 * @param relativePath - The relative path to resolve.
 * @returns The resolved absolute path.
 * @throws GodotMCPError if the resolved path is outside the base directory.
 */
export function safeResolve(basePath: string, relativePath: string): string {
  const resolvedBase = resolve(basePath)
  const resolvedPath = resolve(resolvedBase, relativePath)

  const rel = relative(resolvedBase, resolvedPath)
  const isSafe = !rel.startsWith('..') && !isAbsolute(rel)

  if (!isSafe) {
    throw new GodotMCPError(
      `Access denied: Path traversal detected. Resolved path '${resolvedPath}' is outside base directory '${resolvedBase}'`,
      'INVALID_ARGS',
      'Ensure resource_path is within the project directory.',
    )
  }
  return resolvedPath
}
