import { readdir } from 'node:fs/promises'
import { extname, isAbsolute, join, relative, resolve } from 'node:path'
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
  if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
    throw new GodotMCPError(
      `Access denied: Path '${targetPath}' resolves to '${resolvedTarget}' which is outside the project root '${resolvedBase}'.`,
      'INVALID_ARGS',
      'Ensure all file paths are within the project directory.',
    )
  }

  return resolvedTarget
}

/**
 * Recursively find all files in a directory matching specific extensions.
 * Skips hidden files and directories (starting with '.') and specified ignored directories.
 *
 * @param dir The directory to search in
 * @param extensions A Set of valid file extensions (e.g. `new Set(['.gd', '.tscn'])`)
 * @param ignoreDirs Array of directory names to skip (defaults to ['node_modules', 'build'])
 * @returns Array of absolute file paths
 */
export async function findFiles(
  dir: string,
  extensions: Set<string>,
  ignoreDirs: string[] = ['node_modules', 'build'],
): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    const promises = entries.map(async (entry) => {
      const name = entry.name
      if (name.startsWith('.') || ignoreDirs.includes(name)) return []

      const fullPath = join(dir, name)
      if (entry.isDirectory()) {
        return findFiles(fullPath, extensions, ignoreDirs)
      }
      if (entry.isFile() && extensions.has(extname(name).toLowerCase())) {
        return [fullPath]
      }
      return []
    })

    const nestedResults = await Promise.all(promises)
    return nestedResults.flat()
  } catch {
    // Skip inaccessible directories
    return []
  }
}
