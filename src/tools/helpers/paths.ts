import { realpathSync } from 'node:fs'
import { dirname, isAbsolute, relative, resolve, sep } from 'node:path'
import { GodotMCPError } from './errors.js'

/**
 * Canonicalizes a path by resolving symlinks/firmlinks on the longest existing
 * ancestor, then re-appending any not-yet-created lexical remainder.
 *
 * A plain lexical `resolve()` cannot see through symlinks or the macOS firmlink
 * layout (e.g. `/tmp` -> `/private/tmp`), so a containment check on lexical
 * paths alone can be bypassed. `realpathSync` would throw for paths that do not
 * exist yet (the common "create a new file" case), so we canonicalize only the
 * portion that exists on disk and keep the rest lexical.
 */
function canonicalize(targetPath: string): string {
  let current = resolve(targetPath)
  const tail: string[] = []
  // Walk up until we hit a component that exists on disk (or the filesystem root).
  for (;;) {
    try {
      const real = realpathSync(current)
      // Re-attach the non-existent remainder (if any) to the real prefix.
      return tail.length > 0 ? resolve(real, ...tail.reverse()) : real
    } catch {
      const parent = dirname(current)
      if (parent === current) {
        // Reached the root without finding an existing ancestor; fall back to
        // the lexical resolution so brand-new trees still validate.
        return resolve(targetPath)
      }
      tail.push(current.slice(parent.length + 1))
      current = parent
    }
  }
}

/**
 * Safely resolves a path relative to a base directory, preventing path traversal.
 *
 * Both the base directory and the candidate are canonicalized (symlinks and
 * macOS firmlinks resolved) before the containment check so that traversal
 * cannot be hidden behind a symlinked component.
 *
 * @param baseDir The trusted base directory (e.g. project root)
 * @param targetPath The untrusted path provided by user
 * @returns The resolved absolute path
 * @throws GodotMCPError if the path attempts to traverse outside the base directory
 */
export function safeResolve(baseDir: string, targetPath: string): string {
  // Lexically resolve the requested target first; this is what callers expect
  // back (it keeps not-yet-created paths intact for downstream file writes).
  const resolvedBase = resolve(baseDir)
  const resolvedTarget = resolve(resolvedBase, targetPath)

  // Canonicalize BOTH sides (realpath the existing portions) so the containment
  // check sees through symlinks/firmlinks rather than trusting lexical strings.
  const canonicalBase = canonicalize(resolvedBase)
  const canonicalTarget = canonicalize(resolvedTarget)

  // Calculate relative path from canonical base to canonical target.
  const relativePath = relative(canonicalBase, canonicalTarget)

  // Path is outside the base directory when the relative form:
  // 1. Equals ".." (the parent itself)
  // 2. Starts with "..<sep>" (escapes upward)
  // 3. Is absolute (different drive on Windows, or otherwise unrelated root)
  if (relativePath === '..' || relativePath.startsWith(`..${sep}`) || isAbsolute(relativePath)) {
    throw new GodotMCPError(
      `Access denied: Path '${targetPath}' is outside the project root.`,
      'INVALID_ARGS',
      'Ensure all file paths are within the project directory.',
    )
  }

  return resolvedTarget
}

/**
 * Resolves the trusted project root for a tool invocation.
 *
 * The caller-supplied `project_path` is UNTRUSTED. It must be confined within
 * the operator-configured trusted base (`config.projectPath`, falling back to
 * the server's working directory) before it can be used as a `safeResolve`
 * base for any file operation. Without this confinement an MCP caller could
 * point `project_path` at an arbitrary directory and read / write / delete
 * files outside the intended project (path traversal, CWE-22/23).
 *
 * @param projectPathArg The untrusted `project_path` argument from the caller
 * @param trustedBase The operator-configured project root (e.g. config.projectPath)
 * @returns The absolute, confined project root to use as the base for all
 *          subsequent per-file `safeResolve` calls
 * @throws GodotMCPError if `projectPathArg` escapes the trusted base
 */
export function resolveProjectRoot(projectPathArg: unknown, trustedBase: string | null | undefined): string {
  const base = trustedBase || process.cwd()
  if (typeof projectPathArg === 'string' && projectPathArg.length > 0) {
    return safeResolve(base, projectPathArg)
  }
  return resolve(base)
}

import { access } from 'node:fs/promises'

/**
 * Asynchronously checks if a file or directory exists.
 * @param path The path to check
 * @returns true if the path exists, false otherwise
 */
export async function pathExists(path: string): Promise<boolean> {
  try {
    await access(path)
    return true
  } catch {
    return false
  }
}
