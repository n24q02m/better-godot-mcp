import type { Dirent } from 'node:fs'
import { existsSync } from 'node:fs'
import { access, readdir, stat } from 'node:fs/promises'
import { join } from 'node:path'
/**
 * Tests for Godot binary detector
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { detectGodot, isExecutable, isVersionSupported, parseGodotVersion } from '../../src/godot/detector.js'

// Create a hoisted mock for execFile so we can attach [promisify.custom]
const { execFileMock, execFileAsyncMock } = vi.hoisted(() => {
  return {
    execFileMock: vi.fn(),
    execFileAsyncMock: vi.fn(),
  }
})

vi.mock('node:child_process', () => {
  // Attach the async mock to the main mock's custom promisify property
  const { promisify: _promisify } = require('node:util')
  const mock = execFileMock
  // @ts-expect-error
  mock[_promisify.custom] = execFileAsyncMock
  return {
    execFile: mock,
  }
})

vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>()
  return {
    ...actual,
    existsSync: vi.fn(),
  }
})

vi.mock('node:fs/promises', () => {
  return {
    access: vi.fn(),
    readdir: vi.fn(),
    stat: vi.fn(),
  }
})

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
      const v = parseGodotVersion('4.0')
      expect(v).not.toBeNull()
      expect(v?.major).toBe(4)
      expect(v?.minor).toBe(0)
      expect(v?.patch).toBe(0)
    })

    it('should return null for incomplete version lacking minor', () => {
      expect(parseGodotVersion('4')).toBeNull()
      expect(parseGodotVersion('v4')).toBeNull()
    })

    it('should handle complex filenames as versions', () => {
      const v = parseGodotVersion('Godot_v4.3-stable_win64_console.exe')
      expect(v).not.toBeNull()
      expect(v?.major).toBe(4)
      expect(v?.minor).toBe(3)
      expect(v?.patch).toBe(0)
      expect(v?.label).toBe('stable_win64_console.exe')
    })

    it('should return null for whitespace only', () => {
      expect(parseGodotVersion('  \n\t  ')).toBeNull()
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
  // isExecutable
  // ==========================================
  describe('isExecutable', () => {
    it('should return true for a regular executable file', async () => {
      vi.mocked(stat).mockResolvedValue({ isFile: () => true } as unknown as import('node:fs').Stats)
      vi.mocked(access).mockResolvedValue(undefined)
      expect(await isExecutable('/usr/bin/godot')).toBe(true)
    })

    it('should return false for a directory', async () => {
      vi.mocked(stat).mockResolvedValue({ isFile: () => false } as unknown as import('node:fs').Stats)
      expect(await isExecutable('/usr/bin/')).toBe(false)
    })

    it('should return false when file does not exist', async () => {
      vi.mocked(stat).mockRejectedValue(new Error('ENOENT'))
      expect(await isExecutable('/nonexistent')).toBe(false)
    })

    it('should return false when file exists but is not executable', async () => {
      vi.mocked(stat).mockResolvedValue({ isFile: () => true } as unknown as import('node:fs').Stats)
      vi.mocked(access).mockRejectedValue(new Error('EACCES'))
      expect(await isExecutable('/usr/bin/readme.txt')).toBe(false)
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
      // Default: stat returns a file, access succeeds (isExecutable passes)
      vi.mocked(stat).mockResolvedValue({ isFile: () => true } as unknown as import('node:fs').Stats)
      vi.mocked(access).mockResolvedValue(undefined)
    })

    afterEach(() => {
      process.env = originalEnv
      Object.defineProperty(process, 'platform', { value: originalPlatform })
    })

    it('should detect from GODOT_PATH env var', async () => {
      process.env.GODOT_PATH = '/custom/path/godot'
      vi.mocked(existsSync).mockReturnValue(true)
      execFileAsyncMock.mockResolvedValue({ stdout: 'Godot Engine v4.2.1.stable.official' })

      const result = await detectGodot()

      expect(result).not.toBeNull()
      expect(result?.path).toBe('/custom/path/godot')
      expect(result?.version.major).toBe(4)
      expect(result?.version.minor).toBe(2)
      expect(result?.source).toBe('env')
    })

    it('should detect from system PATH', async () => {
      delete process.env.GODOT_PATH
      // First call is 'which/where godot', second is 'godot --version'
      execFileAsyncMock
        .mockResolvedValueOnce({ stdout: '/usr/local/bin/godot\n' })
        .mockResolvedValueOnce({ stdout: 'Godot Engine v4.1.2.stable.official' })
      vi.mocked(existsSync).mockReturnValue(true)

      const result = await detectGodot()

      expect(result).not.toBeNull()
      expect(result?.path).toBe('/usr/local/bin/godot')
      expect(result?.version.minor).toBe(1)
      expect(result?.source).toBe('path')
    })

    it('should check common Linux paths', async () => {
      delete process.env.GODOT_PATH
      Object.defineProperty(process, 'platform', { value: 'linux' })
      execFileAsyncMock.mockRejectedValue(new Error('not found')) // fail path check

      // Simulate /usr/bin/godot existing
      vi.mocked(stat).mockImplementation((path) => {
        if (path === '/usr/bin/godot')
          return Promise.resolve({ isFile: () => true } as unknown as import('node:fs').Stats)
        return Promise.reject(new Error('ENOENT'))
      })
      vi.mocked(access).mockResolvedValue(undefined)

      // Mock version check for the found path
      execFileAsyncMock.mockImplementation((cmd: string) => {
        if (cmd === '/usr/bin/godot') return Promise.resolve({ stdout: 'Godot Engine v4.3.stable.official' })
        return Promise.reject(new Error('cmd not found'))
      })

      const result = await detectGodot()

      expect(result).not.toBeNull()
      expect(result?.path).toBe('/usr/bin/godot')
      expect(result?.source).toBe('system')
    })

    it('should check common macOS paths', async () => {
      delete process.env.GODOT_PATH
      Object.defineProperty(process, 'platform', { value: 'darwin' })
      execFileAsyncMock.mockRejectedValue(new Error('not found'))

      vi.mocked(stat).mockImplementation((path) => {
        if (path === '/Applications/Godot.app/Contents/MacOS/Godot')
          return Promise.resolve({ isFile: () => true } as unknown as import('node:fs').Stats)
        return Promise.reject(new Error('ENOENT'))
      })
      vi.mocked(access).mockResolvedValue(undefined)

      execFileAsyncMock.mockImplementation((cmd: string) => {
        if (cmd === '/Applications/Godot.app/Contents/MacOS/Godot')
          return Promise.resolve({ stdout: 'Godot Engine v4.3.stable.official' })
        return Promise.reject(new Error('cmd not found'))
      })

      const result = await detectGodot()

      expect(result).not.toBeNull()
      expect(result?.path).toBe('/Applications/Godot.app/Contents/MacOS/Godot')
      expect(result?.source).toBe('system')
    })

    it('should check common Windows paths', async () => {
      delete process.env.GODOT_PATH
      Object.defineProperty(process, 'platform', { value: 'win32' })
      process.env.ProgramFiles = 'C:\\Program Files'

      const expectedPath = join('C:\\Program Files', 'Godot', 'godot.exe')

      execFileAsyncMock.mockRejectedValue(new Error('not found'))

      vi.mocked(stat).mockImplementation((path) => {
        if (path === expectedPath) return Promise.resolve({ isFile: () => true } as unknown as import('node:fs').Stats)
        return Promise.reject(new Error('ENOENT'))
      })
      vi.mocked(access).mockResolvedValue(undefined)
      // findWinGetGodotBinaries
      vi.mocked(existsSync).mockReturnValue(false)

      execFileAsyncMock.mockImplementation((cmd: string) => {
        if (cmd === expectedPath) return Promise.resolve({ stdout: 'Godot Engine v4.3.stable.official' })
        return Promise.reject(new Error('cmd not found'))
      })

      const result = await detectGodot()

      expect(result).not.toBeNull()
      expect(result?.path).toBe(expectedPath)
      expect(result?.source).toBe('system')
    })

    it('should detect WinGet packages on Windows', async () => {
      delete process.env.GODOT_PATH
      Object.defineProperty(process, 'platform', { value: 'win32' })
      process.env.LOCALAPPDATA = 'C:\\Users\\Test\\AppData\\Local'

      const packagesDir = join('C:\\Users\\Test\\AppData\\Local', 'Microsoft', 'WinGet', 'Packages')
      const pkgDir = join(packagesDir, 'GodotEngine.GodotEngine_Microsoft.Winget.Source_8wekyb3d8bbwe')

      execFileAsyncMock.mockRejectedValue(new Error('not found'))

      vi.mocked(existsSync).mockImplementation((path) => {
        if (path === packagesDir) return true
        return false
      })

      vi.mocked(stat).mockImplementation((path) => {
        if (typeof path === 'string' && path.includes('Godot_v4.3-stable_win64.exe'))
          return Promise.resolve({ isFile: () => true } as unknown as import('node:fs').Stats)
        return Promise.reject(new Error('ENOENT'))
      })
      vi.mocked(access).mockResolvedValue(undefined)

      vi.mocked(readdir).mockImplementation(((path: string, _options?: unknown) => {
        if (path === packagesDir) {
          return Promise.resolve([
            {
              isDirectory: () => true,
              name: 'GodotEngine.GodotEngine_Microsoft.Winget.Source_8wekyb3d8bbwe',
            } as Dirent,
          ])
        }
        if (path === pkgDir) {
          return Promise.resolve(['Godot_v4.3-stable_win64.exe', 'Godot_v4.3-stable_win64_console.exe'])
        }
        return Promise.resolve([])
      }) as unknown as typeof readdir)

      execFileAsyncMock.mockImplementation((cmd: string) => {
        if (typeof cmd === 'string' && cmd.includes('Godot_v4.3-stable_win64.exe'))
          return Promise.resolve({ stdout: 'Godot Engine v4.3.stable.official' })
        return Promise.reject(new Error('cmd not found'))
      })

      const result = await detectGodot()

      expect(result).not.toBeNull()
      expect(result?.path).toContain('Godot_v4.3-stable_win64.exe')
      expect(result?.source).toBe('system')
    })

    it('should return null if no Godot found', async () => {
      delete process.env.GODOT_PATH
      execFileAsyncMock.mockRejectedValue(new Error('not found'))
      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(stat).mockRejectedValue(new Error('ENOENT'))
      vi.mocked(readdir).mockResolvedValue([])

      expect(await detectGodot()).toBeNull()
    })

    it('should ignore unsupported versions', async () => {
      process.env.GODOT_PATH = '/old/godot'
      vi.mocked(existsSync).mockReturnValue(true)
      execFileAsyncMock.mockResolvedValue({ stdout: 'Godot Engine v3.5.stable.official' })

      expect(await detectGodot()).toBeNull()
    })
  })
})
