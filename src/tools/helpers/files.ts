import { readdirSync } from 'node:fs'
import { extname, join } from 'node:path'

/**
 * Recursively find files with specific extensions in a directory.
 * Optimized to use `withFileTypes: true` to avoid unnecessary `stat` calls.
 *
 * @param dir - Directory to search
 * @param extensions - List of extensions to include (e.g. ['.tscn', '.gd'])
 * @param extraIgnore - List of additional directories to ignore
 * @returns Array of absolute file paths
 */
export function findFiles(dir: string, extensions: string[], extraIgnore: string[] = []): string[] {
  const results: string[] = []
  const exts = new Set(extensions.map((e) => e.toLowerCase()))
  const ignoreSet = new Set(['node_modules', 'build', ...extraIgnore])

  try {
    const entries = readdirSync(dir, { withFileTypes: true })
    for (const entry of entries) {
      if (entry.name.startsWith('.') || ignoreSet.has(entry.name)) continue

      const fullPath = join(dir, entry.name)

      if (entry.isDirectory()) {
        results.push(...findFiles(fullPath, extensions, extraIgnore))
      } else if (entry.isFile() && exts.has(extname(entry.name).toLowerCase())) {
        results.push(fullPath)
      }
    }
  } catch {
    // Skip inaccessible directories
  }
  return results
}
