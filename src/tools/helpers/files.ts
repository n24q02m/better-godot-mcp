import { readdir } from 'node:fs/promises'
import { extname, join } from 'node:path'

/**
 * Recursively find files in a directory
 * @param dir Directory to search
 * @param extensions Set of file extensions to include (or null for all)
 * @param ignoreDirs Set of directory names to ignore
 * @returns Array of absolute file paths
 */
export async function findFiles(
  dir: string,
  extensions: Set<string> | null,
  ignoreDirs: Set<string> = new Set(['node_modules', 'build', '.git', '.godot']),
): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    const tasks = entries.map(async (entry) => {
      // Ignore hidden files/dirs
      if (entry.name.startsWith('.')) return []

      if (entry.isDirectory()) {
        if (ignoreDirs.has(entry.name)) return []
        return findFiles(join(dir, entry.name), extensions, ignoreDirs)
      }

      if (entry.isFile()) {
        if (!extensions || extensions.has(extname(entry.name).toLowerCase())) {
          return [join(dir, entry.name)]
        }
      }

      return []
    })

    const nestedResults = await Promise.all(tasks)
    return nestedResults.flat().sort()
  } catch {
    // Skip inaccessible directories
    return []
  }
}
