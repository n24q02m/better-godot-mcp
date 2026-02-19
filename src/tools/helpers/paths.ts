import { isAbsolute, relative, resolve, sep } from 'node:path'
import { GodotMCPError } from './errors.js'

/**
 * Safely resolves a path against a base directory (project root).
 * Prevents path traversal attacks by ensuring the resolved path is within the base directory.
 *
 * @param basePath - The project root directory
 * @param relativePath - The path to resolve relative to the base directory
 * @returns The absolute resolved path
 * @throws GodotMCPError if the path is outside the base directory
 */
export function safeResolve(basePath: string, relativePath: string): string {
  const resolvedBase = resolve(basePath)
  const resolvedPath = resolve(resolvedBase, relativePath)

  // Calculate relative path from base to resolved path
  const rel = relative(resolvedBase, resolvedPath)

  // Check if the path traverses outside the base directory
  // 1. rel starts with '..' (or is '..') - meaning it's outside
  // 2. rel is absolute - meaning it's on a different drive (Windows) or absolute path provided

  const isOutside = rel === '..' || rel.startsWith(`..${sep}`) || isAbsolute(rel)

  if (isOutside) {
    throw new GodotMCPError(
      `Access denied: Path resolves outside the project directory.`,
      'INVALID_ARGS',
      'Ensure all paths are within the project directory.',
    )
  }

  return resolvedPath
}
