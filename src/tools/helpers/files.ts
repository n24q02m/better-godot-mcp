import { readdirSync, statSync } from 'node:fs'
import { extname, join } from 'node:path'

/**
 * Recursively find all files in a directory that match a given set of extensions.
 * Optimized with a shared accumulator array to minimize memory allocations.
 */
export function findFiles(dir: string, extensions: Set<string> | string, results: string[] = []): string[] {
  const extSet = typeof extensions === 'string' ? new Set([extensions]) : extensions

  try {
    const entries = readdirSync(dir)
    for (const entry of entries) {
      if (entry.startsWith('.') || entry === 'node_modules' || entry === 'build' || entry === 'addons') continue

      const fullPath = join(dir, entry)
      const stat = statSync(fullPath)

      if (stat.isDirectory()) {
        findFiles(fullPath, extSet, results)
      } else if (extSet.has(extname(entry).toLowerCase())) {
        results.push(fullPath)
      }
    }
  } catch {
    // Skip inaccessible directories
  }

  return results
}
