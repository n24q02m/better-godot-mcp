import { readdir } from 'node:fs/promises'
import { extname, join } from 'node:path'

/**
 * Asynchronously finds all files with a given extension in a directory.
 * Ignores dotfiles, node_modules, build, and addons.
 * @param dir Directory to search
 * @param extension File extension (including dot, e.g., ".gd")
 */
export async function findFiles(dir: string, extension: string): Promise<string[]> {
  try {
    const entries = await readdir(dir, { withFileTypes: true })
    const files: string[] = []
    const promises: Promise<string[]>[] = []

    for (const entry of entries) {
      if (
        entry.name.startsWith('.') ||
        entry.name === 'node_modules' ||
        entry.name === 'build' ||
        entry.name === 'addons'
      ) {
        continue
      }

      const fullPath = join(dir, entry.name)

      if (entry.isDirectory()) {
        promises.push(findFiles(fullPath, extension))
      } else if (entry.isFile() && extname(entry.name).toLowerCase() === extension.toLowerCase()) {
        files.push(fullPath)
      }
    }

    const nestedFiles = await Promise.all(promises)
    for (const nested of nestedFiles) {
      files.push(...nested)
    }

    return files
  } catch {
    // Return empty array on error (e.g. permission denied) to allow traversal to continue elsewhere
    return []
  }
}
