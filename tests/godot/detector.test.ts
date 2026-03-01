import { execFileSync } from 'node:child_process'
import { existsSync, type PathLike, readdirSync } from 'node:fs'
/**
 * Tests for Godot binary detector
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { detectGodot, isVersionSupported, parseGodotVersion } from '../../src/godot/detector.js'

vi.mock('node:child_process')
vi.mock('node:fs')
vi.mock('node:path', () => ({
  join: (...args: string[]) => {
    if (process.platform === 'win32') {
      return args.join('\\')
    }
    return args.join('/')
  },
}))

describe('detector', () => {
  // ==========================================
  // parseGodotVersion
  // ==========================================
  describe('parseGodotVersion', () => {
    it('should parse standard version string', () => {
      const v = parseGodotVersion('Godot Engine v4.6.stable.official')
      expect(v).not.toBeNull()
      expect(v?.major).toBe(4)
      expect(v?.minor).toBe(6)
      expect(v?.patch).toBe(0)
    })

    it('should parse version with patch number', () => {
      const v = parseGodotVersion('4.3.1.stable')
      expect(v).not.toBeNull()
      expect(v?.major).toBe(4)
      expect(v?.minor).toBe(3)
      expect(v?.patch).toBe(1)
    })

    it('should parse beta version', () => {
      const v = parseGodotVersion('Godot Engine v4.4.beta1')
      expect(v).not.toBeNull()
      expect(v?.major).toBe(4)
      expect(v?.minor).toBe(4)
      expect(v?.label).toContain('beta')
    })

    it('should parse RC version', () => {
      const v = parseGodotVersion('Godot Engine v4.5.rc2')
      expect(v).not.toBeNull()
      expect(v?.major).toBe(4)
      expect(v?.minor).toBe(5)
    })

    it('should parse version with dev label', () => {
      const v = parseGodotVersion('Godot Engine v5.0.dev.abcdef')
      expect(v).not.toBeNull()
      expect(v?.major).toBe(5)
      expect(v?.minor).toBe(0)
    })

    it('should parse mono version', () => {
      const v = parseGodotVersion('Godot Engine v4.2.1.stable.mono')
      expect(v).not.toBeNull()
      expect(v?.major).toBe(4)
      expect(v?.minor).toBe(2)
      expect(v?.patch).toBe(1)
    })

    it('should return null for invalid string', () => {
      expect(parseGodotVersion('not a version')).toBeNull()
    })

    it('should return null for empty string', () => {
      expect(parseGodotVersion('')).toBeNull()
    })

    it('should capture raw string', () => {
      const raw = 'Godot Engine v4.6.stable.official'
      const v = parseGodotVersion(raw)
      expect(v?.raw).toBe(raw)
    })

    it('should trim raw string', () => {
      const v = parseGodotVersion('  4.6.stable  \n')
      expect(v?.raw).toBe('4.6.stable')
    })
  })

  // ==========================================
  // isVersionSupported
  // ==========================================
  describe('isVersionSupported', () => {
    const makeVersion = (major: number, minor: number, patch = 0) => ({
      major,
      minor,
      patch,
      label: 'stable',
      raw: `${major}.${minor}.${patch}`,
    })

    it('should support 4.1 (minimum)', () => {
      expect(isVersionSupported(makeVersion(4, 1))).toBe(true)
    })

    it('should support 4.6 (above minimum)', () => {
      expect(isVersionSupported(makeVersion(4, 6))).toBe(true)
    })

    it('should NOT support 4.0 (below minimum minor)', () => {
      expect(isVersionSupported(makeVersion(4, 0))).toBe(false)
    })

    it('should NOT support 3.x (old major)', () => {
      expect(isVersionSupported(makeVersion(3, 5))).toBe(false)
      expect(isVersionSupported(makeVersion(3, 99))).toBe(false)
    })

    it('should support 5.x (future major)', () => {
      expect(isVersionSupported(makeVersion(5, 0))).toBe(true)
    })

    it('should support 4.1.3 (with patch)', () => {
      expect(isVersionSupported(makeVersion(4, 1, 3))).toBe(true)
    })
  })

  // ==========================================
  // detectGodot
  // ==========================================
  describe('detectGodot', () => {
    const originalEnv = process.env
    const originalPlatform = process.platform

    beforeEach(() => {
      vi.clearAllMocks()
      process.env = { ...originalEnv }
    })

    afterEach(() => {
      process.env = originalEnv
      Object.defineProperty(process, 'platform', { value: originalPlatform })
    })

    it('should detect from GODOT_PATH env var', () => {
      process.env.GODOT_PATH = '/custom/path/godot'
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(execFileSync).mockReturnValue('Godot Engine v4.2.1.stable.official')

      const result = detectGodot()

      expect(result).not.toBeNull()
      expect(result?.path).toBe('/custom/path/godot')
      expect(result?.version.major).toBe(4)
      expect(result?.version.minor).toBe(2)
      expect(result?.source).toBe('env')
    })

    it('should detect from system PATH', () => {
      delete process.env.GODOT_PATH
      // First call is 'which/where godot', second is 'godot --version'
      vi.mocked(execFileSync)
        .mockReturnValueOnce('/usr/local/bin/godot\n')
        .mockReturnValueOnce('Godot Engine v4.1.2.stable.official')
      vi.mocked(existsSync).mockReturnValue(true)

      const result = detectGodot()

      expect(result).not.toBeNull()
      expect(result?.path).toBe('/usr/local/bin/godot')
      expect(result?.version.minor).toBe(1)
      expect(result?.source).toBe('path')
    })

    it('should check common Linux paths', () => {
      delete process.env.GODOT_PATH
      Object.defineProperty(process, 'platform', { value: 'linux' })
      vi.mocked(execFileSync).mockImplementation((_cmd) => {
        throw new Error('not found')
      }) // fail path check

      // Simulate /usr/bin/godot existing
      vi.mocked(existsSync).mockImplementation((path) => path === '/usr/bin/godot')

      // Mock version check for the found path
      vi.mocked(execFileSync).mockImplementation((cmd) => {
        if (cmd === '/usr/bin/godot') return 'Godot Engine v4.3.stable.official'
        throw new Error('cmd not found')
      })

      const result = detectGodot()

      expect(result).not.toBeNull()
      expect(result?.path).toBe('/usr/bin/godot')
      expect(result?.source).toBe('system')
    })

    it('should check common macOS paths', () => {
      delete process.env.GODOT_PATH
      Object.defineProperty(process, 'platform', { value: 'darwin' })
      vi.mocked(execFileSync).mockImplementation((_cmd) => {
        throw new Error('not found')
      })

      vi.mocked(existsSync).mockImplementation((path) => path === '/Applications/Godot.app/Contents/MacOS/Godot')

      vi.mocked(execFileSync).mockImplementation((cmd) => {
        if (cmd === '/Applications/Godot.app/Contents/MacOS/Godot') return 'Godot Engine v4.3.stable.official'
        throw new Error('cmd not found')
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

      vi.mocked(existsSync).mockImplementation((path) => path === 'C:\\Program Files\\Godot\\godot.exe')

      vi.mocked(execFileSync).mockImplementation((cmd) => {
        if (cmd === 'C:\\Program Files\\Godot\\godot.exe') return 'Godot Engine v4.3.stable.official'
        throw new Error('cmd not found')
      })

      const result = detectGodot()

      expect(result).not.toBeNull()
      expect(result?.path).toBe('C:\\Program Files\\Godot\\godot.exe')
      expect(result?.source).toBe('system')
    })

    it('should detect WinGet packages on Windows', () => {
      delete process.env.GODOT_PATH
      Object.defineProperty(process, 'platform', { value: 'win32' })
      process.env.LOCALAPPDATA = 'C:\\Users\\Test\\AppData\\Local'

      const packagesDir = 'C:\\Users\\Test\\AppData\\Local\\Microsoft\\WinGet\\Packages'
      const pkgDir =
        'C:\\Users\\Test\\AppData\\Local\\Microsoft\\WinGet\\Packages\\GodotEngine.GodotEngine_Microsoft.Winget.Source_8wekyb3d8bbwe'

      vi.mocked(execFileSync).mockImplementation(() => {
        throw new Error('not found')
      })

      vi.mocked(existsSync).mockImplementation((path) => {
        if (path === packagesDir) return true
        if (typeof path === 'string' && path.includes('Godot_v4.3-stable_win64.exe')) return true
        return false
      })

      // Fix strict type checks by using unknown then casting to expected return type
      vi.mocked(readdirSync).mockImplementation(((path: PathLike) => {
        if (path === packagesDir) {
          return [
            {
              isDirectory: () => true,
              name: 'GodotEngine.GodotEngine_Microsoft.Winget.Source_8wekyb3d8bbwe',
            },
          ] as unknown as ReturnType<typeof readdirSync>
        }
        if (path === pkgDir) {
          return ['Godot_v4.3-stable_win64.exe', 'Godot_v4.3-stable_win64_console.exe'] as unknown as ReturnType<
            typeof readdirSync
          >
        }
        return [] as unknown as ReturnType<typeof readdirSync>
        // biome-ignore lint/suspicious/noExplicitAny: mock overload
      }) as any)

      vi.mocked(execFileSync).mockImplementation((cmd) => {
        if (typeof cmd === 'string' && cmd.includes('Godot_v4.3-stable_win64.exe'))
          return 'Godot Engine v4.3.stable.official'
        throw new Error('cmd not found')
      })

      const result = detectGodot()

      expect(result).not.toBeNull()
      expect(result?.path).toContain('Godot_v4.3-stable_win64.exe')
      expect(result?.source).toBe('system')
    })

    it('should return null if no Godot found', () => {
      delete process.env.GODOT_PATH
      vi.mocked(execFileSync).mockImplementation(() => {
        throw new Error('not found')
      })
      vi.mocked(existsSync).mockReturnValue(false)
      // biome-ignore lint/suspicious/noExplicitAny: mock overload
      vi.mocked(readdirSync).mockImplementation(((_path: PathLike) => []) as any)

      expect(detectGodot()).toBeNull()
    })

    it('should ignore unsupported versions', () => {
      process.env.GODOT_PATH = '/old/godot'
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(execFileSync).mockReturnValue('Godot Engine v3.5.stable.official')

      expect(detectGodot()).toBeNull()
    })
  })
})
