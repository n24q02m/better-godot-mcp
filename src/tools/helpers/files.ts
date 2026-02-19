import { readdirSync, statSync } from 'node:fs'
import { extname, join } from 'node:path'

/**
 * Common directories to ignore during file searches
 */
export const DEFAULT_IGNORE_DIRS = ['node_modules', 'build']

/**
 * Recursively find files in a directory with specific extensions
 * @param dir Directory to search
 * @param extensions Set of file extensions to include (e.g. ['.tscn', '.gd'])
 * @param ignoreDirs Array of directory names to ignore
 */
export function findFiles(dir: string, extensions: Set<string>, ignoreDirs: string[] = DEFAULT_IGNORE_DIRS): string[] {
  const results: string[] = []

  try {
    const entries = readdirSync(dir)
    for (const entry of entries) {
      // Ignore hidden files/directories (starting with .)
      if (entry.startsWith('.')) continue

      // Ignore specified directories
      if (ignoreDirs.includes(entry)) continue

      const fullPath = join(dir, entry)
      const stat = statSync(fullPath)

      if (stat.isDirectory()) {
        results.push(...findFiles(fullPath, extensions, ignoreDirs))
      } else if (extensions.has(extname(entry).toLowerCase())) {
        results.push(fullPath)
      }
    }
  } catch {
    // Skip inaccessible directories
  }

  return results
}
