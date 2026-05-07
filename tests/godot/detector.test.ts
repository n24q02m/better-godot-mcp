import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { access, open, readdir, stat } from 'node:fs/promises'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  detectGodot,
  isExecutable,
  isLikelyGodotBinary,
  isVersionSupported,
  parseGodotVersion,
  tryGetVersion,
} from '../../src/godot/detector.js'

// Mock node:child_process
vi.mock('node:child_process', () => ({
  execFile: vi.fn(),
}))

// Mock node:fs/promises
vi.mock('node:fs/promises', () => ({
  access: vi.fn(),
  open: vi.fn(),
  readdir: vi.fn(),
  stat: vi.fn(),
}))

// Mock node:fs
vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  constants: {
    X_OK: 1,
  },
}))

describe('detector', () => {
  describe('parseGodotVersion', () => {
    it('should parse standard version strings', () => {
      const v = parseGodotVersion('Godot Engine v4.2.1.stable.official')
      expect(v).toEqual({
        major: 4,
        minor: 2,
        patch: 1,
        label: 'stable.official',
        raw: 'Godot Engine v4.2.1.stable.official',
      })
    })

    it('should parse short version strings', () => {
      const v = parseGodotVersion('4.1.stable')
      expect(v).toEqual({
        major: 4,
        minor: 1,
        patch: 0,
        label: 'stable',
        raw: '4.1.stable',
      })
    })

    it('should parse dev/beta versions', () => {
      const v = parseGodotVersion('4.3.dev6')
      expect(v).toEqual({
        major: 4,
        minor: 3,
        patch: 0,
        label: 'dev6',
        raw: '4.3.dev6',
      })
    })

    it('should return null for invalid strings', () => {
      expect(parseGodotVersion('not a version')).toBeNull()
    })
  })

  describe('isVersionSupported', () => {
    it('should support 4.1+', () => {
      expect(isVersionSupported({ major: 4, minor: 1, patch: 0, label: 'stable', raw: '' })).toBe(true)
      expect(isVersionSupported({ major: 4, minor: 2, patch: 0, label: 'stable', raw: '' })).toBe(true)
      expect(isVersionSupported({ major: 5, minor: 0, patch: 0, label: 'stable', raw: '' })).toBe(true)
    })

    it('should reject versions below 4.1', () => {
      expect(isVersionSupported({ major: 4, minor: 0, patch: 0, label: 'stable', raw: '' })).toBe(false)
      expect(isVersionSupported({ major: 3, minor: 5, patch: 0, label: 'stable', raw: '' })).toBe(false)
    })
  })

  describe('isExecutable', () => {
    it('should return true for executable files', async () => {
      vi.mocked(stat).mockResolvedValue({ isFile: () => true } as any)
      vi.mocked(access).mockResolvedValue(undefined)
      expect(await isExecutable('/path/to/exe')).toBe(true)
    })

    it('should return false for directories', async () => {
      vi.mocked(stat).mockResolvedValue({ isFile: () => false } as any)
      expect(await isExecutable('/path/to/dir')).toBe(false)
    })

    it('should return false if access fails', async () => {
      vi.mocked(stat).mockResolvedValue({ isFile: () => true } as any)
      vi.mocked(access).mockRejectedValue(new Error('no access'))
      expect(await isExecutable('/path/to/locked')).toBe(false)
    })
  })

  describe('isLikelyGodotBinary', () => {
    it('should return true if Godot signature is found', async () => {
      const mockHandle = {
        stat: vi.fn().mockResolvedValue({ size: 1024 }),
        read: vi.fn().mockImplementation((buffer: Buffer) => {
          buffer.write('Godot Engine')
          return Promise.resolve({ bytesRead: 12 })
        }),
        close: vi.fn().mockResolvedValue(undefined),
      }
      vi.mocked(open).mockResolvedValue(mockHandle as any)

      expect(await isLikelyGodotBinary('/path/to/godot')).toBe(true)
      expect(mockHandle.close).toHaveBeenCalled()
    })

    it('should return false if no signature is found', async () => {
      const mockHandle = {
        stat: vi.fn().mockResolvedValue({ size: 1024 }),
        read: vi.fn().mockImplementation((buffer: Buffer) => {
          buffer.write('Random data')
          return Promise.resolve({ bytesRead: 11 })
        }),
        close: vi.fn().mockResolvedValue(undefined),
      }
      vi.mocked(open).mockResolvedValue(mockHandle as any)

      expect(await isLikelyGodotBinary('/path/to/fake')).toBe(false)
    })
  })

  describe('tryGetVersion', () => {
    it('should return null if not likely a Godot binary', async () => {
      // Mock isLikelyGodotBinary to fail
      const mockHandle = {
        stat: vi.fn().mockResolvedValue({ size: 1024 }),
        read: vi.fn().mockImplementation((buffer: Buffer) => {
          buffer.write('Not a godot binary')
          return Promise.resolve({ bytesRead: 18 })
        }),
        close: vi.fn().mockResolvedValue(undefined),
      }
      vi.mocked(open).mockResolvedValue(mockHandle as any)
      expect(await tryGetVersion('/path/to/fake')).toBeNull()
    })

    it('should return version if execFile succeeds', async () => {
      // Mock isLikelyGodotBinary to pass
      const mockHandle = {
        stat: vi.fn().mockResolvedValue({ size: 1024 }),
        read: vi.fn().mockImplementation((buffer: Buffer) => {
          buffer.write('Godot Engine')
          return Promise.resolve({ bytesRead: 12 })
        }),
        close: vi.fn().mockResolvedValue(undefined),
      }
      vi.mocked(open).mockResolvedValue(mockHandle as any)

      vi.mocked(execFile).mockImplementation((_cmd, _args, _opts, callback: any) => {
        callback(null, { stdout: '4.2.1.stable' })
      })
      const v = await tryGetVersion('/path/to/godot')
      expect(v).not.toBeNull()
      expect(v?.major).toBe(4)
      expect(v?.minor).toBe(2)
      expect(v?.patch).toBe(1)
    })

    it('should return null if execFile throws', async () => {
      // Mock isLikelyGodotBinary to pass
      const mockHandle = {
        stat: vi.fn().mockResolvedValue({ size: 1024 }),
        read: vi.fn().mockImplementation((buffer: Buffer) => {
          buffer.write('Godot Engine')
          return Promise.resolve({ bytesRead: 12 })
        }),
        close: vi.fn().mockResolvedValue(undefined),
      }
      vi.mocked(open).mockResolvedValue(mockHandle as any)

      vi.mocked(execFile).mockImplementation((_cmd, _args, _opts, callback: any) => {
        callback(new Error('exec failed'))
      })
      expect(await tryGetVersion('/path/to/godot')).toBeNull()
    })
  })

  describe('detectGodot', () => {
    const originalEnv = process.env
    const originalPlatform = process.platform

    beforeEach(() => {
      vi.clearAllMocks()
      process.env = { ...originalEnv }
      // Default: stat returns a file, access succeeds (isExecutable passes)
      vi.mocked(stat).mockResolvedValue({ isFile: () => true, size: 1024 } as any)
      vi.mocked(access).mockResolvedValue(undefined)

      const mockHandle = {
        stat: vi.fn().mockResolvedValue({ size: 1024 }),
        read: vi.fn().mockImplementation((buffer: Buffer) => {
          buffer.write('Godot Engine')
          return Promise.resolve({ bytesRead: 12 })
        }),
        close: vi.fn().mockResolvedValue(undefined),
      }
      vi.mocked(open).mockResolvedValue(mockHandle as any)
    })

    afterEach(() => {
      process.env = originalEnv
      Object.defineProperty(process, 'platform', { value: originalPlatform })
    })

    it('should detect from GODOT_PATH env var', async () => {
      process.env.GODOT_PATH = '/custom/path/godot'
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(execFile).mockImplementation((_cmd, _args, _opts, callback: any) => {
        callback(null, { stdout: 'Godot Engine v4.2.1.stable.official' })
      })

      const result = await detectGodot()

      expect(result).not.toBeNull()
      expect(result?.path).toBe('/custom/path/godot')
      expect(result?.version.major).toBe(4)
      expect(result?.version.minor).toBe(2)
      expect(result?.source).toBe('env')
    })

    it('should detect from system PATH', async () => {
      delete process.env.GODOT_PATH
      vi.mocked(execFile).mockImplementation((cmd, _args, _opts, callback: any) => {
        if (cmd === 'which' || cmd === 'where') {
          callback(null, { stdout: '/usr/local/bin/godot\n' })
        } else {
          callback(null, { stdout: 'Godot Engine v4.1.2.stable.official' })
        }
      })
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
      vi.mocked(execFile).mockImplementation((cmd, _args, _opts, callback: any) => {
        if (cmd === 'which') {
          callback(new Error('not found'))
        } else if (cmd === '/usr/bin/godot') {
          callback(null, { stdout: 'Godot Engine v4.3.stable.official' })
        } else {
          callback(new Error('cmd not found'))
        }
      })

      vi.mocked(stat).mockImplementation((path) => {
        if (path === '/usr/bin/godot') return Promise.resolve({ isFile: () => true, size: 1024 } as any)
        return Promise.reject(new Error('ENOENT'))
      })

      const result = await detectGodot()

      expect(result).not.toBeNull()
      expect(result?.path).toBe('/usr/bin/godot')
      expect(result?.source).toBe('system')
    })

    it('should return null if no Godot found', async () => {
      delete process.env.GODOT_PATH
      vi.mocked(execFile).mockImplementation((_cmd, _args, _opts, callback: any) => {
        callback(new Error('not found'))
      })
      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(stat).mockRejectedValue(new Error('ENOENT'))
      vi.mocked(readdir).mockResolvedValue([])

      expect(await detectGodot()).toBeNull()
    })
  })
})
