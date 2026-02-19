import { isAbsolute, relative, resolve, sep } from 'node:path'
import { GodotMCPError } from './errors.js'

/**
 * Safely resolves a path relative to a base directory, preventing path traversal.
 *
 * @param basePath - The trusted base directory (absolute or relative to cwd)
 * @param paths - Path segments to resolve relative to basePath
 * @returns The resolved absolute path
 * @throws GodotMCPError if the resolved path is outside the base path
 */
export function safeResolve(basePath: string, ...paths: string[]): string {
  // Ensure we have an absolute base path
  const absoluteBase = resolve(basePath)

  // Resolve the target path
  const resolvedPath = resolve(absoluteBase, ...paths)

  // Check if the resolved path is inside the base path
  const rel = relative(absoluteBase, resolvedPath)

  // On Windows, relative can return an absolute path if on a different drive.
  // We also check for '..' at the start to catch traversal.
  // Note: '..foo' is a valid filename, so we check for '..' exact match or '..' followed by separator.
  const isOutside =
    rel === '..' ||
    rel.startsWith(`..${sep}`) ||
    (process.platform === 'win32' && isAbsolute(rel))

  if (isOutside) {
    throw new GodotMCPError(
      'Access denied: Path traversal detected',
      'INVALID_ARGS',
      `Path '${paths.join('/')}' resolves to '${resolvedPath}', which is outside the project directory '${absoluteBase}'`
    )
  }

  return resolvedPath
}
