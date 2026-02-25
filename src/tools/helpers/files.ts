import { readdir } from 'node:fs/promises'
import { extname, join } from 'node:path'

/**
 * Asynchronously find files in a directory recursively.
 *
 * @param dir The directory to search in.
 * @param extensions A set of file extensions to include (e.g., new Set(['.tscn'])).
 * @param extraIgnores A list of directory names to ignore (in addition to standard ignores).
 * @returns A promise that resolves to an array of full file paths.
 */
export async function findFiles(dir: string, extensions?: Set<string>, extraIgnores: string[] = []): Promise<string[]> {
  const results: string[] = []
  const ignores = new Set(['node_modules', 'build', '.git', '.godot', ...extraIgnores])

  try {
    const entries = await readdir(dir, { withFileTypes: true })
    const promises: Promise<string[]>[] = []

    for (const entry of entries) {
      const name = entry.name

      // Standard ignores: hidden files/dirs and specific folders
      if (name.startsWith('.') || ignores.has(name)) {
        continue
      }

      const fullPath = join(dir, name)

      if (entry.isDirectory()) {
        promises.push(findFiles(fullPath, extensions, extraIgnores))
      } else if (!extensions || extensions.has(extname(name).toLowerCase())) {
        results.push(fullPath)
      }
    }

    const subResults = await Promise.all(promises)
    for (const sub of subResults) {
      results.push(...sub)
    }
  } catch {
    // Skip inaccessible directories or errors
  }

  return results
}
