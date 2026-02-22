import { readdir } from 'node:fs/promises'
import { extname, join } from 'node:path'

/**
 * Recursively find files with specific extensions in a directory
 * @param dir Directory to search
 * @param extensions List of extensions to include (e.g., ['.tscn', '.gd']) - must be lowercase
 * @param ignoreDirs List of directory names to ignore
 * @returns Array of full file paths
 */
export async function findFiles(
  dir: string,
  extensions: string[],
  ignoreDirs: string[] = ['node_modules', 'build', '.git', '.godot'],
): Promise<string[]> {
  const results: string[] = []

  try {
    const entries = await readdir(dir, { withFileTypes: true })
    const promises = entries.map(async (entry) => {
      const name = entry.name

      // Skip hidden files/dirs
      if (name.startsWith('.')) return

      if (ignoreDirs.includes(name)) return

      const fullPath = join(dir, name)

      if (entry.isDirectory()) {
        try {
          const subResults = await findFiles(fullPath, extensions, ignoreDirs)
          results.push(...subResults)
        } catch {
          // Ignore access errors for subdirectories
        }
      } else if (entry.isFile() && extensions.includes(extname(name).toLowerCase())) {
        results.push(fullPath)
      }
    })

    await Promise.all(promises)
  } catch {
    // Ignore access errors for the directory
  }

  return results
}
