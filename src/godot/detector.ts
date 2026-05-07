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
import {
  accessSync,
  closeSync,
  constants,
  existsSync,
  fstatSync,
  openSync,
  readdirSync,
  readSync,
  statSync,
} from 'node:fs'
import { join } from 'node:path'
import type { DetectionResult, GodotVersion } from './types.js'

const GODOT_BINARY_NAMES = ['godot', 'godot4', 'godot-preview', 'Godot_v4']
const MIN_VERSION = { major: 4, minor: 1 }

/**
 * Parse Godot version string (e.g., "Godot Engine v4.6.stable.official")
 */
export function parseGodotVersion(versionOutput: string): GodotVersion | null {
  // Match patterns like "Godot Engine v4.6.stable" or "4.6.1.stable"
  const match = versionOutput.match(/v?(\d+)\.(\d+)(?:\.(\d+))?(?:[.\s-]+([^\s.-]\S*))?/)
  if (!match) return null

  return {
    major: Number.parseInt(match[1], 10),
    minor: Number.parseInt(match[2], 10),
    patch: match[3] ? Number.parseInt(match[3], 10) : 0,
    label: match[4]?.replace(/\.$/, '') || 'stable',
    raw: versionOutput.trim(),
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
 * Try to get Godot version from a binary path.
 * When skipSignatureCheck is true (e.g. user explicitly provided the path),
 * the binary signature heuristic is skipped and only --version validation is used.
 */
export function tryGetVersion(binaryPath: string, skipSignatureCheck = false): GodotVersion | null {
  if (!skipSignatureCheck && !isLikelyGodotBinary(binaryPath)) return null
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
 * Check if a file is likely a Godot binary by looking for specific signatures.
 * This is a security measure to prevent execution of arbitrary binaries via config.
 */
export function isLikelyGodotBinary(filePath: string): boolean {
  let fd: number | null = null
  try {
    fd = openSync(filePath, 'r')
    const stats = fstatSync(fd)
    const fileSize = stats.size
    const sig1 = Buffer.from('Godot Engine')
    const sig2 = Buffer.from('GDScript')

    const fastSize = 64 * 1024
    const fastBuf = Buffer.alloc(fastSize)
    const headRead = readSync(fd, fastBuf, 0, Math.min(fastSize, fileSize), 0)
    if (headRead > 0 && (fastBuf.subarray(0, headRead).includes(sig1) || fastBuf.subarray(0, headRead).includes(sig2)))
      return true
    if (fileSize > fastSize) {
      const tailOffset = fileSize - fastSize
      const tailRead = readSync(fd, fastBuf, 0, fastSize, tailOffset)
      if (
        tailRead > 0 &&
        (fastBuf.subarray(0, tailRead).includes(sig1) || fastBuf.subarray(0, tailRead).includes(sig2))
      )
        return true
    }

    const chunkSize = 4 * 1024 * 1024
    const maxSigLen = Math.max(sig1.length, sig2.length)
    const overlap = maxSigLen - 1
    const step = chunkSize - overlap
    const buffer = Buffer.alloc(chunkSize)
    for (let offset = 0; offset < fileSize; offset += step) {
      const readLen = Math.min(chunkSize, fileSize - offset)
      const bytesRead = readSync(fd, buffer, 0, readLen, offset)
      if (buffer.subarray(0, bytesRead).includes(sig1) || buffer.subarray(0, bytesRead).includes(sig2)) return true
    }
    return false
  } catch {
    return false
  } finally {
    if (fd !== null) {
      try {
        closeSync(fd)
      } catch {
        /* ignore */
      }
    }
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
      '/Applications/Godot_preview.app/Contents/MacOS/Godot',
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
      '/usr/bin/godot-preview',
      '/opt/godot-preview/godot-preview',
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
  // 1. Check GODOT_PATH env var — enforce signature heuristic for security
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
