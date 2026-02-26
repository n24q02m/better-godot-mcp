import { readdir } from 'node:fs/promises'
import { extname, join } from 'node:path'

/**
 * Recursively find all files with a specific extension in a directory.
 * Uses async readdir and Promise.all for parallel traversal.
 *
 * @param dir The directory to search
 * @param extension The file extension to look for (e.g., '.tscn')
 * @param ignore Additional directory names to ignore (defaults to standard hidden/build dirs)
 * @returns Array of absolute file paths
 */
export async function findFiles(dir: string, extension: string, ignore: string[] = []): Promise<string[]> {
  const results: string[] = []
  const defaultIgnore = ['.git', '.godot', 'node_modules', 'build', 'addons']
  const ignoreSet = new Set([...defaultIgnore, ...ignore])

  try {
    const entries = await readdir(dir, { withFileTypes: true })
    const tasks: Promise<string[]>[] = []

    for (const entry of entries) {
      if (entry.name.startsWith('.') || ignoreSet.has(entry.name)) continue

      const fullPath = join(dir, entry.name)

      if (entry.isDirectory()) {
        tasks.push(findFiles(fullPath, extension, ignore))
      } else if (entry.isFile() && extname(entry.name) === extension) {
        results.push(fullPath)
      }
    }

    const subResults = await Promise.all(tasks)
    for (const sub of subResults) {
      results.push(...sub)
    }
  } catch {
    // Skip inaccessible directories
    return []
  }

  return results
}
