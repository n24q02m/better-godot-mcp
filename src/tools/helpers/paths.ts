import { isAbsolute, relative, resolve } from 'node:path'
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
  // Normalize all separators for the traversal check to handle Windows paths on POSIX
  const normalizedRelative = relativePath.replaceAll('\\', '/')

  // Cross-platform absolute path check
  const isWindowsAbsolute = /^[a-zA-Z]:[\\/]/.test(targetPath) || targetPath.startsWith('\\\\')
  const isPosixAbsolute = targetPath.startsWith('/')
  const isActuallyAbsolute = isAbsolute(targetPath)

  if (normalizedRelative === '..' || normalizedRelative.startsWith('../') || isAbsolute(relativePath)) {
    throw new GodotMCPError(
      `Access denied: Path '${targetPath}' is outside the project root.`,
      'INVALID_ARGS',
      'Ensure all file paths are within the project directory.',
    )
  }

  // If it's absolute on ANY platform but NOT considered absolute by the current platform's 'resolve' logic
  // it might have been resolved as a relative path. We should check if it's still inside.
  // Actually, if it's Windows-absolute on POSIX, resolve(base, 'C:\test') -> 'base/C:\test'
  // relative('base', 'base/C:\test') -> 'C:\test'
  // isAbsolute('C:\test') -> false on POSIX.
  // So it passes the above check.
  // We want to reject Windows-style absolute paths on POSIX for safety.
  if (process.platform !== 'win32' && isWindowsAbsolute) {
    throw new GodotMCPError(
      `Access denied: Windows-style absolute path '${targetPath}' is not allowed on this platform.`,
      'INVALID_ARGS',
      'Use relative paths within the project directory.',
    )
  }

  if (process.platform === 'win32' && isPosixAbsolute && !isActuallyAbsolute) {
    // On Windows, /test might be resolved relative to the current drive root.
    // resolve('C:\base', '/test') -> 'C:\test'
    // relative('C:\base', 'C:\test') -> '..\test' -> already caught by normalizedRelative.startsWith('../')
  }

  return resolvedTarget
}

import { access } from 'node:fs/promises'

/**
 * Asynchronously checks if a file or directory exists.
 * @param path The path to check
 * @returns true if the path exists, false otherwise
 */
export async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}
