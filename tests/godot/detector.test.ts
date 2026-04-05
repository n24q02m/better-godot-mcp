import { execFileSync } from 'node:child_process'
import type { Dirent, PathLike } from 'node:fs'
import { accessSync, existsSync, readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { detectGodot, isExecutable, isVersionSupported, parseGodotVersion } from '../../src/godot/detector.js'

vi.mock('node:child_process')
vi.mock('node:fs')

describe('detector', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.resetModules()

    // Default mock for isExecutable to return true for most things to avoid breakage
    vi.mocked(statSync).mockReturnValue({ isFile: () => true } as any)
    vi.mocked(accessSync).mockReturnValue(undefined)
  })

  describe('parseGodotVersion', () => {
    it('should parse standard version string', () => {
      const v = parseGodotVersion('Godot Engine v4.6.stable.official')
      expect(v).toEqual({
        major: 4,
        minor: 6,
        patch: 0,
        label: 'stable.official',
        raw: 'Godot Engine v4.6.stable.official',
      })
    })

    it('should parse version with patch number', () => {
      const v = parseGodotVersion('4.3.2.stable')
      expect(v?.major).toBe(4)
      expect(v?.minor).toBe(3)
      expect(v?.patch).toBe(2)
    })

    it('should parse beta version', () => {
      const v = parseGodotVersion('4.6.beta1')
      expect(v?.label).toBe('beta1')
    })

    it('should parse RC version', () => {
      const v = parseGodotVersion('4.6-rc2')
      expect(v?.label).toBe('rc2')
    })

    it('should parse version with dev label', () => {
      const v = parseGodotVersion('4.6.dev')
      expect(v?.label).toBe('dev')
    })

    it('should parse mono version', () => {
      const v = parseGodotVersion('Godot Engine v4.6.stable.mono.official')
      expect(v?.major).toBe(4)
      expect(v?.minor).toBe(6)
    })

    it('should return null for invalid string', () => {
      expect(parseGodotVersion('not a version')).toBeNull()
    })

    it('should return null for empty string', () => {
      expect(parseGodotVersion('')).toBeNull()
    })

    it('should capture raw string', () => {
      const v = parseGodotVersion('4.6')
      expect(v?.raw).toBe('4.6')
    })

    it('should trim raw string', () => {
      const v = parseGodotVersion('  4.6  ')
      expect(v?.raw).toBe('4.6')
    })

    it('should parse version with only major and minor', () => {
      const v = parseGodotVersion('4.1')
      expect(v?.major).toBe(4)
      expect(v?.minor).toBe(1)
      expect(v?.patch).toBe(0)
    })

    it('should parse version with just v prefix and numbers', () => {
      const v = parseGodotVersion('v4.2.1')
      expect(v?.major).toBe(4)
      expect(v?.minor).toBe(2)
      expect(v?.patch).toBe(1)
    })

    it('should parse simple version numbers without v', () => {
      const v = parseGodotVersion('4.2.1')
      expect(v?.major).toBe(4)
      expect(v?.minor).toBe(2)
      expect(v?.patch).toBe(1)
    })

    it('should return null for incomplete version lacking minor', () => {
      expect(parseGodotVersion('4')).toBeNull()
      expect(parseGodotVersion('v4')).toBeNull()
    })

    it('should handle complex filenames as versions', () => {
      const v = parseGodotVersion('Godot_v4.3-stable_win64.exe')
      expect(v?.major).toBe(4)
      expect(v?.minor).toBe(3)
    })

    it('should return null for whitespace only', () => {
      expect(parseGodotVersion('   ')).toBeNull()
    })
  })

  describe('isVersionSupported', () => {
    it('should support 4.1 (minimum)', () => {
      expect(
        isVersionSupported({
          major: 4,
          minor: 1,
          patch: 0,
          label: 'stable',
          raw: '',
        }),
      ).toBe(true)
    })

    it('should support 4.6 (above minimum)', () => {
      expect(
        isVersionSupported({
          major: 4,
          minor: 6,
          patch: 0,
          label: 'stable',
          raw: '',
        }),
      ).toBe(true)
    })

    it('should NOT support 4.0 (below minimum minor)', () => {
      expect(
        isVersionSupported({
          major: 4,
          minor: 0,
          patch: 0,
          label: 'stable',
          raw: '',
        }),
      ).toBe(false)
    })

    it('should NOT support 3.x (old major)', () => {
      expect(
        isVersionSupported({
          major: 3,
          minor: 9,
          patch: 0,
          label: 'stable',
          raw: '',
        }),
      ).toBe(false)
    })

    it('should support 5.x (future major)', () => {
      expect(
        isVersionSupported({
          major: 5,
          minor: 0,
          patch: 0,
          label: 'stable',
          raw: '',
        }),
      ).toBe(true)
    })

    it('should support 4.1.3 (with patch)', () => {
      expect(
        isVersionSupported({
          major: 4,
          minor: 1,
          patch: 3,
          label: 'stable',
          raw: '',
        }),
      ).toBe(true)
    })
  })

  describe('isExecutable', () => {
    it('should return true for a regular executable file', () => {
      vi.mocked(statSync).mockReturnValue({ isFile: () => true } as any)
      vi.mocked(accessSync).mockReturnValue(undefined)
      expect(isExecutable('/path/to/godot')).toBe(true)
    })

    it('should return false for a directory', () => {
      vi.mocked(statSync).mockReturnValue({ isFile: () => false } as any)
      expect(isExecutable('/path/to/dir')).toBe(false)
    })

    it('should return false when file does not exist', () => {
      vi.mocked(statSync).mockImplementation(() => {
        throw new Error()
      })
      expect(isExecutable('/nonexistent')).toBe(false)
    })

    it('should return false when file exists but is not executable', () => {
      vi.mocked(statSync).mockReturnValue({ isFile: () => true } as any)
      vi.mocked(accessSync).mockImplementation(() => {
        throw new Error()
      })
      expect(isExecutable('/path/to/non-exec')).toBe(false)
    })
  })

  describe('detectGodot', () => {
    const originalPlatform = process.platform
    const originalEnv = { ...process.env }

    beforeEach(() => {
      process.env = { ...originalEnv }
    })

    afterEach(() => {
      Object.defineProperty(process, 'platform', { value: originalPlatform })
    })

    it('should detect from GODOT_PATH env var', () => {
      process.env.GODOT_PATH = '/env/path/godot'
      vi.mocked(statSync).mockReturnValue({ isFile: () => true } as any)
      vi.mocked(accessSync).mockReturnValue(undefined)
      vi.mocked(execFileSync).mockReturnValue('v4.6.stable' as any)

      const result = detectGodot()

      expect(result).not.toBeNull()
      expect(result?.path).toBe('/env/path/godot')
      expect(result?.source).toBe('env')
    })

    it('should detect from system PATH', () => {
      delete process.env.GODOT_PATH
      Object.defineProperty(process, 'platform', { value: 'linux' })

      vi.mocked(execFileSync).mockImplementation((cmd, args) => {
        if (cmd === 'which' && args && args[0] === 'godot') return '/usr/bin/godot\n'
        if (cmd === '/usr/bin/godot') return 'v4.6.stable'
        throw new Error('not found')
      })

      const result = detectGodot()

      expect(result).not.toBeNull()
      expect(result?.path).toBe('/usr/bin/godot')
      expect(result?.source).toBe('path')
    })

    it('should check common Linux paths', () => {
      delete process.env.GODOT_PATH
      Object.defineProperty(process, 'platform', { value: 'linux' })

      vi.mocked(execFileSync).mockImplementation((_cmd) => {
        throw new Error('not found')
      })

      vi.mocked(existsSync).mockImplementation((path) => path === '/usr/local/bin/godot')
      vi.mocked(statSync).mockImplementation((path) => {
        if (path === '/usr/local/bin/godot') return { isFile: () => true } as any
        throw new Error()
      })
      vi.mocked(accessSync).mockReturnValue(undefined)
      vi.mocked(execFileSync).mockImplementation((cmd) => {
        if (cmd === '/usr/local/bin/godot') return 'v4.6.stable'
        throw new Error()
      })

      const result = detectGodot()

      expect(result).not.toBeNull()
      expect(result?.path).toBe('/usr/local/bin/godot')
      expect(result?.source).toBe('system')
    })

    it('should check common macOS paths', () => {
      delete process.env.GODOT_PATH
      Object.defineProperty(process, 'platform', { value: 'darwin' })

      vi.mocked(execFileSync).mockImplementation((_cmd) => {
        throw new Error('not found')
      })

      vi.mocked(existsSync).mockImplementation((path) => path === '/Applications/Godot.app/Contents/MacOS/Godot')
      vi.mocked(statSync).mockImplementation((path) => {
        if (path === '/Applications/Godot.app/Contents/MacOS/Godot') return { isFile: () => true } as any
        throw new Error()
      })
      vi.mocked(accessSync).mockReturnValue(undefined)
      vi.mocked(execFileSync).mockImplementation((cmd) => {
        if (cmd === '/Applications/Godot.app/Contents/MacOS/Godot') return 'v4.6.stable'
        throw new Error()
      })

      const result = detectGodot()

      expect(result).not.toBeNull()
      expect(result?.path).toBe('/Applications/Godot.app/Contents/MacOS/Godot')
      expect(result?.source).toBe('system')
    })

    it('should check common Windows paths', () => {
      delete process.env.GODOT_PATH
      Object.defineProperty(process, 'platform', { value: 'win32' })
      process.env.ProgramFiles = 'C:\\Program Files'

      vi.mocked(execFileSync).mockImplementation((_cmd) => {
        throw new Error('not found')
      })

      const targetPath = join('C:\\Program Files', 'Godot', 'godot.exe')

      vi.mocked(existsSync).mockImplementation((path) => path === targetPath)
      vi.mocked(statSync).mockImplementation((path) => {
        if (path === targetPath) return { isFile: () => true } as any
        throw new Error()
      })
      vi.mocked(accessSync).mockReturnValue(undefined)
      vi.mocked(execFileSync).mockImplementation((cmd) => {
        if (cmd === targetPath) return 'Godot Engine v4.3.stable.official'
        throw new Error('cmd not found')
      })

      const result = detectGodot()

      expect(result).not.toBeNull()
      expect(result?.path).toBe(targetPath)
      expect(result?.source).toBe('system')
    })

    it('should detect WinGet packages on Windows', () => {
      delete process.env.GODOT_PATH
      Object.defineProperty(process, 'platform', { value: 'win32' })
      process.env.LOCALAPPDATA = 'C:\\Users\\Test\\AppData\\Local'

      const packagesDir = join('C:\\Users\\Test\\AppData\\Local', 'Microsoft', 'WinGet', 'Packages')
      const pkgName = 'GodotEngine.GodotEngine_Microsoft.Winget.Source_8wekyb3d8bbwe'
      const pkgDir = join(packagesDir, pkgName)
      const targetExe = 'Godot_v4.3-stable_win64.exe'
      const targetPath = join(pkgDir, targetExe)

      vi.mocked(execFileSync).mockImplementation(() => {
        throw new Error('not found')
      })

      vi.mocked(existsSync).mockImplementation((path) => {
        if (path === packagesDir) return true
        if (path === targetPath) return true
        return false
      })

      vi.mocked(readdirSync).mockImplementation(((path: PathLike, _options?: unknown) => {
        if (path === packagesDir) {
          return [
            {
              isDirectory: () => true,
              name: pkgName,
            } as Dirent,
          ]
        }
        if (path === pkgDir) {
          return [targetExe, 'Godot_v4.3-stable_win64_console.exe']
        }
        return []
      }) as typeof readdirSync)

      vi.mocked(statSync).mockImplementation((path) => {
        if (path === targetPath) return { isFile: () => true } as any
        throw new Error()
      })
      vi.mocked(accessSync).mockReturnValue(undefined)

      vi.mocked(execFileSync).mockImplementation((cmd) => {
        if (cmd === targetPath) return 'Godot Engine v4.3.stable.official'
        throw new Error('cmd not found')
      })

      const result = detectGodot()

      expect(result).not.toBeNull()
      expect(result?.path).toBe(targetPath)
      expect(result?.source).toBe('system')
    })

    it('should return null if no Godot found', () => {
      delete process.env.GODOT_PATH
      vi.mocked(execFileSync).mockImplementation(() => {
        throw new Error('not found')
      })
      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(statSync).mockImplementation(() => {
        throw new Error()
      })

      const result = detectGodot()
      expect(result).toBeNull()
    })

    it('should ignore unsupported versions', () => {
      process.env.GODOT_PATH = '/old/godot'
      vi.mocked(statSync).mockReturnValue({ isFile: () => true } as any)
      vi.mocked(accessSync).mockReturnValue(undefined)
      vi.mocked(execFileSync).mockReturnValue('v3.5.stable' as any)

      const result = detectGodot()
      expect(result).toBeNull()
    })
  })
})
