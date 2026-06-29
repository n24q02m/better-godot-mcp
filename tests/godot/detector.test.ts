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

vi.mock('node:child_process', () => ({
  execFile: vi.fn(),
}))
vi.mock('node:fs')
vi.mock('node:fs/promises')

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
      const v = parseGodotVersion('Godot Engine v4.3.rc2')
      expect(v).not.toBeNull()
      expect(v?.major).toBe(4)
      expect(v?.minor).toBe(3)
      expect(v?.label).toBe('rc2')
    })

    it('should parse dev version', () => {
      const v = parseGodotVersion('4.7.dev4.official.755fa449c')
      expect(v).not.toBeNull()
      expect(v?.major).toBe(4)
      expect(v?.minor).toBe(7)
      expect(v?.label).toBe('dev4.official.755fa449c')
    })

    it('should return null for invalid strings', () => {
      expect(parseGodotVersion('Not a version')).toBeNull()
      expect(parseGodotVersion('')).toBeNull()
    })
  })

  // ==========================================
  // isVersionSupported
  // ==========================================
  describe('isVersionSupported', () => {
    it('should support 4.1+', () => {
      expect(isVersionSupported({ major: 4, minor: 1, patch: 0, label: 'stable', raw: '' })).toBe(true)
      expect(isVersionSupported({ major: 4, minor: 6, patch: 0, label: 'stable', raw: '' })).toBe(true)
      expect(isVersionSupported({ major: 5, minor: 0, patch: 0, label: 'stable', raw: '' })).toBe(true)
    })

    it('should reject versions below 4.1', () => {
      expect(isVersionSupported({ major: 4, minor: 0, patch: 0, label: 'stable', raw: '' })).toBe(false)
      expect(isVersionSupported({ major: 3, minor: 5, patch: 0, label: 'stable', raw: '' })).toBe(false)
    })
  })

  // ==========================================
  // isExecutable
  // ==========================================
  describe('isExecutable', () => {
    it('should return true for executable files', async () => {
      vi.mocked(stat).mockResolvedValue({ isFile: () => true } as unknown as import('node:fs').Stats)
      vi.mocked(access).mockResolvedValue(undefined)
      expect(await isExecutable('/path/to/godot')).toBe(true)
    })

    it('should return false if access fails', async () => {
      vi.mocked(stat).mockResolvedValue({ isFile: () => true } as unknown as import('node:fs').Stats)
      vi.mocked(access).mockRejectedValue(new Error('no access'))
      expect(await isExecutable('/path/to/godot')).toBe(false)
    })

    it('should return false if it is a directory', async () => {
      vi.mocked(stat).mockResolvedValue({ isFile: () => false } as unknown as import('node:fs').Stats)
      expect(await isExecutable('/path/to/dir')).toBe(false)
    })
  })

  // ==========================================
  // isLikelyGodotBinary
  // ==========================================
  describe('isLikelyGodotBinary', () => {
    it('should return true if signature found in head', async () => {
      const mockHandle = {
        stat: vi.fn().mockResolvedValue({ size: 1024 }),
        read: vi.fn().mockImplementation((buf: Buffer) => {
          buf.write('Godot Engine')
          return Promise.resolve({ bytesRead: 12 })
        }),
        close: vi.fn().mockResolvedValue(undefined),
      }
      vi.mocked(open).mockResolvedValue(mockHandle as any)

      expect(await isLikelyGodotBinary('/path/to/godot')).toBe(true)
      expect(mockHandle.read).toHaveBeenCalled()
      expect(mockHandle.close).toHaveBeenCalled()
    })

    it('should return true if signature found in tail', async () => {
      const fileSize = 200 * 1024
      const mockHandle = {
        stat: vi.fn().mockResolvedValue({ size: fileSize }),
        read: vi
          .fn()
          .mockResolvedValueOnce({ bytesRead: 100 }) // head: no sig
          .mockImplementationOnce((buf: Buffer) => {
            buf.write('GDScript')
            return Promise.resolve({ bytesRead: 8 })
          }), // tail: sig
        close: vi.fn().mockResolvedValue(undefined),
      }
      vi.mocked(open).mockResolvedValue(mockHandle as any)

      expect(await isLikelyGodotBinary('/path/to/godot')).toBe(true)
    })

    it('should return false if no signature found', async () => {
      const mockHandle = {
        stat: vi.fn().mockResolvedValue({ size: 1024 }),
        read: vi.fn().mockResolvedValue({ bytesRead: 100 }),
        close: vi.fn().mockResolvedValue(undefined),
      }
      vi.mocked(open).mockResolvedValue(mockHandle as any)

      expect(await isLikelyGodotBinary('/path/to/other')).toBe(false)
    })

    it('should return false on open error', async () => {
      vi.mocked(open).mockRejectedValue(new Error('fail'))
      expect(await isLikelyGodotBinary('/path/to/fail')).toBe(false)
    })
  })

  // ==========================================
  // tryGetVersion
  // ==========================================
  describe('tryGetVersion', () => {
    it('should return null if not likely godot binary', async () => {
      // Mock isLikelyGodotBinary to fail
      const mockHandle = {
        stat: vi.fn().mockResolvedValue({ size: 1024 }),
        read: vi.fn().mockResolvedValue({ bytesRead: 100 }),
        close: vi.fn().mockResolvedValue(undefined),
      }
      vi.mocked(open).mockResolvedValue(mockHandle as any)

      expect(await tryGetVersion('/path/to/other')).toBeNull()
    })

    it('should return version if execFile succeeds', async () => {
      // Mock isLikelyGodotBinary to pass
      const mockHandle = {
        stat: vi.fn().mockResolvedValue({ size: 1024 }),
        read: vi.fn().mockImplementation((buf: Buffer) => {
          buf.write('Godot Engine')
          return Promise.resolve({ bytesRead: 12 })
        }),
        close: vi.fn().mockResolvedValue(undefined),
      }
      vi.mocked(open).mockResolvedValue(mockHandle as any)

      vi.mocked(execFile).mockImplementation(((_path, _args, _options, callback) => {
        const cb: any = typeof _options === 'function' ? _options : callback
        cb(null, { stdout: '4.2.1.stable' })
        return {} as any
      }) as any)

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
        read: vi.fn().mockImplementation((buf: Buffer) => {
          buf.write('Godot Engine')
          return Promise.resolve({ bytesRead: 12 })
        }),
        close: vi.fn().mockResolvedValue(undefined),
      }
      vi.mocked(open).mockResolvedValue(mockHandle as any)

      vi.mocked(execFile).mockImplementation(((_path, _args, _options, callback) => {
        const cb: any = typeof _options === 'function' ? _options : callback
        cb(new Error('exec failed'))
        return {} as any
      }) as any)

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
      vi.mocked(stat).mockResolvedValue({
        isFile: () => true,
        size: 50 * 1024 * 1024,
      } as unknown as import('node:fs').Stats)
      vi.mocked(access).mockResolvedValue(undefined)
      const mockHandle = {
        stat: vi.fn().mockResolvedValue({ size: 50 * 1024 * 1024 }),
        read: vi.fn().mockImplementation((buf: Buffer) => {
          buf.write('Godot Engine')
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
      vi.mocked(execFile).mockImplementation(((_path, _args, _options, callback) => {
        const cb: any = typeof _options === 'function' ? _options : callback
        cb(null, { stdout: 'Godot Engine v4.2.1.stable.official' })
        return {} as any
      }) as any)

      const result = await detectGodot()
      expect(result?.source).toBe('env')
    })

    it('should detect from system PATH', async () => {
      delete process.env.GODOT_PATH
      // First call is 'which/where godot', second is 'godot --version'
      vi.mocked(execFile)
        .mockImplementationOnce(((_cmd, _args, _options, callback) => {
          const cb: any = typeof _options === 'function' ? _options : callback
          cb(null, { stdout: '/usr/local/bin/godot\n' })
          return {} as any
        }) as any)
        .mockImplementationOnce(((_cmd, _args, _options, callback) => {
          const cb: any = typeof _options === 'function' ? _options : callback
          cb(null, { stdout: 'Godot Engine v4.1.2.stable.official' })
          return {} as any
        }) as any)

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
      vi.mocked(execFile).mockImplementation(((cmd, _args, _options, callback) => {
        const cb: any = typeof _options === 'function' ? _options : callback
        if (cmd === 'which' || (Array.isArray(_args) && _args.includes('which'))) {
          cb(new Error('not found'))
        } else if (cmd === '/usr/bin/godot' || (Array.isArray(_args) && _args.includes('/usr/bin/godot'))) {
          cb(null, { stdout: 'Godot Engine v4.3.stable.official' })
        } else if (_args && Array.isArray(_args) && _args.includes('--version')) {
          cb(null, { stdout: 'Godot Engine v4.3.stable.official' })
        } else {
          cb(new Error(`cmd not found: ${cmd}`))
        }
        return {} as any
      }) as any)

      // Simulate /usr/bin/godot existing
      vi.mocked(existsSync).mockImplementation((path) => path === '/usr/bin/godot')
      vi.mocked(stat).mockImplementation((path) => {
        if (path === '/usr/bin/godot')
          return Promise.resolve({ isFile: () => true, size: 1024 } as unknown as import('node:fs').Stats)
        return Promise.reject(new Error('ENOENT'))
      })

      const result = await detectGodot()

      expect(result).not.toBeNull()
      expect(result?.path).toBe('/usr/bin/godot')
      expect(result?.source).toBe('system')
    })

    it('should return null if no Godot found', async () => {
      delete process.env.GODOT_PATH
      vi.mocked(execFile).mockImplementation(((_cmd, _args, _options, callback) => {
        const cb: any = typeof _options === 'function' ? _options : callback
        cb(new Error('not found'))
        return {} as any
      }) as any)
      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(stat).mockRejectedValue(new Error('ENOENT'))
      vi.mocked(readdir).mockResolvedValue([])

      expect(await detectGodot()).toBeNull()
    })

    it('should ignore unsupported versions', async () => {
      process.env.GODOT_PATH = '/old/godot'
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(execFile).mockImplementation(((_path, _args, _options, callback) => {
        const cb: any = typeof _options === 'function' ? _options : callback
        cb(null, { stdout: 'Godot Engine v3.5.stable.official' })
        return {} as any
      }) as any)

      expect(await detectGodot()).toBeNull()
    })
  })
})
