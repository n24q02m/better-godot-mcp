/**
 * Cross-platform Godot binary detection
 *
 * Detection chain:
 * 1. GODOT_PATH env var (highest priority)
 * 2. PATH lookup (which/where)
 * 3. Platform-specific common install locations
 * 4. Validate version >= 4.1
 */

import { execFileSync } from 'node:child_process'
import { accessSync, constants, existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import type { DetectionResult, GodotVersion } from './types.js'

const GODOT_BINARY_NAMES = ['godot', 'godot4', 'Godot_v4']
const MIN_VERSION = { major: 4, minor: 1 }

/**
 * Parse Godot version string (e.g., "Godot Engine v4.3.stable.official")
 *
 * Security: Uses strict regex with anchors and Godot-specific heuristics
 * to prevent arbitrary binaries (like ls or node) from spoofing Godot.
 */
export function parseGodotVersion(versionOutput: string): GodotVersion | null {
  const trimmed = versionOutput.trim()
  if (!trimmed) return null

  // Match patterns like "Godot Engine v4.6.stable", "4.6.1.stable", or "Godot_v4.3-stable"
  // Using ^ and $ anchors is critical for security to ensure we match the whole
  // output and not just a version number hidden inside a different tool's output.
  const match = trimmed.match(/^(?:Godot[ _](?:Engine[ _])?)?v?(\d+)\.(\d+)(?:\.(\d+))?(?:[.\s-]+([^\s.-]\S*))?$/i)
  if (!match) return null

  const major = Number.parseInt(match[1], 10)
  const minor = Number.parseInt(match[2], 10)
  const patch = match[3] ? Number.parseInt(match[3], 10) : 0
  const labelRaw = match[4]?.replace(/\.$/, '')

  // Security Heuristic: Ensure this is actually a Godot binary.
  // Godot versions typically include "Godot" or common labels (stable, official, etc.).
  // Generic binaries (like node) that just return "vX.Y.Z" are rejected.
  const isLikelyGodot =
    trimmed.toLowerCase().includes('godot') ||
    (labelRaw && /stable|dev|beta|rc|alpha|mono|official/i.test(labelRaw)) ||
    // Fallback for custom builds: expect a reasonable Godot 4.x version range
    // if no other markers are present.
    (major === 4 && minor >= 0 && minor < 10)

  if (!isLikelyGodot) return null

  return {
    major,
    minor,
    patch,
    label: labelRaw || 'stable',
    raw: trimmed,
  }
}

/**
 * Check if a Godot version meets minimum requirements
 */
export function isVersionSupported(version: GodotVersion): boolean {
  if (version.major > MIN_VERSION.major) return true
  if (version.major === MIN_VERSION.major && version.minor >= MIN_VERSION.minor) return true
  return false
}

/**
 * Try to get Godot version from a binary path
 */
export function tryGetVersion(binaryPath: string): GodotVersion | null {
  try {
    const output = execFileSync(binaryPath, ['--version'], {
      timeout: 5000,
      stdio: ['pipe', 'pipe', 'pipe'],
      encoding: 'utf-8',
    })
    return parseGodotVersion(output)
  } catch {
    return null
  }
}

/**
 * Check if a binary path exists, is a regular file, and is executable.
 * Rejects directories and other non-file entries to prevent arbitrary binary execution.
 */
export function isExecutable(filePath: string): boolean {
  try {
    const stats = statSync(filePath)
    if (!stats.isFile()) return false
    accessSync(filePath, constants.X_OK)
    return true
  } catch {
    return false
  }
}

/**
 * Try to find binary in system PATH using which/where
 */
function findInPath(): string | null {
  const cmd = process.platform === 'win32' ? 'where' : 'which'
  for (const name of GODOT_BINARY_NAMES) {
    try {
      const result = execFileSync(cmd, [name], {
        timeout: 3000,
        stdio: ['pipe', 'pipe', 'pipe'],
        encoding: 'utf-8',
      })
      const path = result.trim().split('\n')[0].trim()
      if (path && isExecutable(path)) return path
    } catch {
      // Not found, continue
    }
  }
  return null
}

/**
 * Find Godot binaries in WinGet Packages directory.
 * WinGet installs to Packages/GodotEngine.GodotEngine_xxx/Godot_vN-stable_win64_console.exe
 * but often fails to create symlinks in Links/ without admin privileges.
 */
function findWinGetGodotBinaries(localAppData: string): string[] {
  const results: string[] = []
  const packagesDir = join(localAppData, 'Microsoft', 'WinGet', 'Packages')
  if (!existsSync(packagesDir)) return results

  try {
    const dirs = readdirSync(packagesDir, { withFileTypes: true })
    for (const dir of dirs) {
      if (!dir.isDirectory() || !dir.name.startsWith('GodotEngine.GodotEngine')) continue
      const pkgDir = join(packagesDir, dir.name)
      try {
        const files = readdirSync(pkgDir)
        // Prefer GUI version (has actual editor window), then console as fallback
        const regularExe = files.find((f) => /^Godot_v[\d.]+-\w+_win64\.exe$/i.test(f) && !f.includes('console'))
        if (regularExe) results.push(join(pkgDir, regularExe))
        const consoleExe = files.find((f) => /^Godot_v[\d.]+-\w+_win64_console\.exe$/i.test(f))
        if (consoleExe) results.push(join(pkgDir, consoleExe))
      } catch {
        // Skip unreadable package directories
      }
    }
  } catch {
    // Packages directory not readable
  }

  return results
}

/**
 * Platform-specific common Godot install locations
 */
function getSystemPaths(): string[] {
  const paths: string[] = []

  if (process.platform === 'win32') {
    const programFiles = process.env.ProgramFiles || 'C:\\Program Files'
    const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)'
    const localAppData = process.env.LOCALAPPDATA || ''
    const userProfile = process.env.USERPROFILE || ''

    paths.push(
      // WinGet install location (symlink — requires admin)
      join(localAppData, 'Microsoft', 'WinGet', 'Links', 'godot.exe'),
      // WinGet packages (actual binary — works without admin)
      ...findWinGetGodotBinaries(localAppData),
      // Standard install locations
      join(programFiles, 'Godot', 'godot.exe'),
      join(programFilesX86, 'Godot', 'godot.exe'),
      // Scoop
      join(userProfile, 'scoop', 'apps', 'godot', 'current', 'godot.exe'),
      // Steam
      join(programFiles, 'Steam', 'steamapps', 'common', 'Godot Engine', 'godot.exe'),
    )
  } else if (process.platform === 'darwin') {
    paths.push(
      '/Applications/Godot.app/Contents/MacOS/Godot',
      '/Applications/Godot_mono.app/Contents/MacOS/Godot',
      // Homebrew
      '/opt/homebrew/bin/godot',
      '/usr/local/bin/godot',
    )
  } else {
    // Linux
    paths.push(
      '/usr/bin/godot',
      '/usr/local/bin/godot',
      '/usr/bin/godot4',
      // Snap
      '/snap/bin/godot',
      '/snap/bin/godot-4',
      '/snap/godot-4/current/godot-4',
      // Flatpak
      '/var/lib/flatpak/exports/bin/org.godotengine.Godot',
    )

    // AppImage in home directory
    const home = process.env.HOME || ''
    if (home) {
      paths.push(join(home, 'Applications', 'Godot.AppImage'), join(home, '.local', 'bin', 'godot'))
    }
  }

  return paths
}

/**
 * Detect Godot binary on the system
 *
 * @returns Detection result or null if not found
 */
export function detectGodot(): DetectionResult | null {
  // 1. Check GODOT_PATH env var
  const envPath = process.env.GODOT_PATH
  if (envPath && isExecutable(envPath)) {
    const version = tryGetVersion(envPath)
    if (version && isVersionSupported(version)) {
      return { path: envPath, version, source: 'env' }
    }
  }

  // 2. Check system PATH
  const pathResult = findInPath()
  if (pathResult) {
    const version = tryGetVersion(pathResult)
    if (version && isVersionSupported(version)) {
      return { path: pathResult, version, source: 'path' }
    }
  }

  // 3. Check platform-specific locations
  for (const systemPath of getSystemPaths()) {
    if (isExecutable(systemPath)) {
      const version = tryGetVersion(systemPath)
      if (version && isVersionSupported(version)) {
        return { path: systemPath, version, source: 'system' }
      }
    }
  }

  return null
}
