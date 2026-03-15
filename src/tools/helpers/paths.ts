import { access } from 'node:fs/promises'
import { isAbsolute, relative, resolve, sep } from 'node:path'
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
  // 1. Starts with .. (parent directory)
  // 2. Is absolute (on Windows, could be different drive)
  // 3. relativePath should not be absolute if it's inside base
  if (relativePath === '..' || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath)) {
    throw new GodotMCPError(
      `Access denied: Path '${targetPath}' resolves to '${resolvedTarget}' which is outside the project root '${resolvedBase}'.`,
      'INVALID_ARGS',
      'Ensure all file paths are within the project directory.',
    )
  }

  return resolvedTarget
}

/**
 * Asynchronously checks if a path exists.
 * @param path The path to check
 * @returns Promise resolving to boolean indicating existence
 */
export async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}
