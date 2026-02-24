import { isAbsolute, relative, resolve } from 'node:path'
import { GodotMCPError } from './errors.js'

/**
 * Safely resolve a path relative to a base directory.
 * Throws ACCESS_DENIED if the resolved path is outside the base directory.
 *
 * @param base The base directory (trusted)
 * @param target The target path (untrusted, potentially relative)
 * @returns The resolved absolute path
 */
export function safeResolve(base: string, target: string): string {
  const resolvedBase = resolve(base)
  const resolvedTarget = resolve(resolvedBase, target)

  const rel = relative(resolvedBase, resolvedTarget)

  // Check if the relative path starts with '..' (outside)
  // Also check if it's absolute but on a different drive (Windows) or completely unrelated
  // The 'relative' check covers most cases:
  // - inside: "foo/bar"
  // - outside: "../foo"
  // - same: ""

  if (rel.startsWith('..') || isAbsolute(rel)) {
    throw new GodotMCPError(
      `Access denied: Path "${target}" is outside the project directory.`,
      'ACCESS_DENIED',
      'Ensure the path is within the project structure.',
    )
  }

  return resolvedTarget
}
