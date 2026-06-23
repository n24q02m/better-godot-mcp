import { execFile } from 'node:child_process'
import {
  access,
  open,
  readdir,
  stat,
} from 'node:fs/promises'
import { join } from 'node:path'
/**
 * Tests for Godot binary detector
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mocking before imports
vi.mock('node:child_process', () => ({
  execFile: vi.fn()
}))
vi.mock('node:fs/promises')

import {
  detectGodot,
  isExecutable,
  isLikelyGodotBinary,
  isVersionSupported,
  parseGodotVersion,
  tryGetVersion,
} from '../../src/godot/detector.js'

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
      const v = parseGodotVersion('4.4.rc2')
      expect(v).not.toBeNull()
      expect(v?.major).toBe(4)
      expect(v?.minor).toBe(4)
      expect(v?.label).toBe('rc2')
    })

    it('should handle version with commit hash', () => {
      const v = parseGodotVersion('4.7.dev.755fa449c')
      expect(v).not.toBeNull()
      expect(v?.major).toBe(4)
      expect(v?.minor).toBe(7)
      expect(v?.label).toBe('dev.755fa449c')
    })

    it('should return null for invalid version strings', () => {
      expect(parseGodotVersion('Invalid Engine v1')).toBeNull()
      expect(parseGodotVersion('')).toBeNull()
    })
  })

  // ==========================================
  // isVersionSupported
  // ==========================================
  describe('isVersionSupported', () => {
    it('should accept 4.1 or higher', () => {
      expect(isVersionSupported({ major: 4, minor: 1, patch: 0, label: 'stable', raw: '' })).toBe(true)
      expect(isVersionSupported({ major: 4, minor: 2, patch: 0, label: 'stable', raw: '' })).toBe(true)
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
      vi.mocked(stat).mockResolvedValue({ isFile: () => true } as any)
      vi.mocked(access).mockResolvedValue(undefined)
      expect(await isExecutable('/path/to/godot')).toBe(true)
    })

    it('should return false if path is a directory', async () => {
      vi.mocked(stat).mockResolvedValue({ isFile: () => false } as any)
      expect(await isExecutable('/path/to/dir')).toBe(false)
    })

    it('should return false if access is denied', async () => {
      vi.mocked(stat).mockResolvedValue({ isFile: () => true } as any)
      vi.mocked(access).mockRejectedValue(new Error('denied'))
      expect(await isExecutable('/path/to/godot')).toBe(false)
    })
  })

  // ==========================================
  // tryGetVersion
  // ==========================================
  describe('tryGetVersion', () => {
    it('should return version if binary signature check passes and execFile succeeds', async () => {
      const mockStats = { isFile: () => true, size: 100 } as any
      const mockHandle = {
        stat: vi.fn().mockResolvedValue(mockStats),
        read: vi.fn().mockImplementation((buffer: Buffer) => {
          buffer.write('Godot Engine')
          return Promise.resolve({ bytesRead: 12 })
        }),
        close: vi.fn().mockResolvedValue(undefined),
      }
      vi.mocked(open).mockResolvedValue(mockHandle as any)

      vi.mocked(execFile).mockImplementation(((_path: any, _args: any, _options: any, callback: any) => {
        callback(null, { stdout: '4.2.1.stable', stderr: '' })
        return {} as any
      }) as any)

      const v = await tryGetVersion('/path/to/godot')
      expect(v).not.toBeNull()
      expect(v?.major).toBe(4)
    })

    it('should return version if skipSignatureCheck is true', async () => {
      vi.mocked(execFile).mockImplementation(((_path: any, _args: any, _options: any, callback: any) => {
        callback(null, { stdout: '4.2.1.stable', stderr: '' })
        return {} as any
      }) as any)

      const v = await tryGetVersion('/path/to/godot', true)
      expect(v).not.toBeNull()
      expect(v?.major).toBe(4)
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

      vi.mocked(stat).mockResolvedValue({ isFile: () => true, size: 100 } as any)
      vi.mocked(access).mockResolvedValue(undefined)

      const mockHandle = {
        stat: vi.fn().mockResolvedValue({ isFile: () => true, size: 100 } as any),
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

      vi.mocked(execFile).mockImplementation(((_path: any, _args: any, _options: any, callback: any) => {
        callback(null, { stdout: 'Godot Engine v4.2.1.stable.official', stderr: '' })
        return {} as any
      }) as any)

      const result = await detectGodot()
      expect(result?.source).toBe('env')
      expect(result?.path).toBe('/custom/path/godot')
    })

    it('should detect from system PATH', async () => {
      delete process.env.GODOT_PATH

      vi.mocked(execFile).mockImplementation(((cmd: any, args: any, _options: any, callback: any) => {
        if (args && (args[0] === 'godot' || args[0] === 'which' || args[0] === 'where')) {
           callback(null, { stdout: '/usr/local/bin/godot\n', stderr: '' })
        } else {
           callback(null, { stdout: 'Godot Engine v4.1.2.stable.official', stderr: '' })
        }
        return {} as any
      }) as any)

      const result = await detectGodot()
      expect(result).not.toBeNull()
      expect(result?.path).toBe('/usr/local/bin/godot')
      expect(result?.source).toBe('path')
    })

    it('should check common Linux paths', async () => {
      delete process.env.GODOT_PATH
      Object.defineProperty(process, 'platform', { value: 'linux' })

      vi.mocked(execFile).mockImplementation(((cmd: any, args: any, _options: any, callback: any) => {
        if (args && (args[0] === 'godot' || args[0] === 'which')) {
          callback(new Error('not found'), { stdout: '', stderr: '' })
        } else if (cmd === '/usr/bin/godot') {
          callback(null, { stdout: 'Godot Engine v4.3.stable.official', stderr: '' })
        } else {
          callback(new Error('not found'), { stdout: '', stderr: '' })
        }
        return {} as any
      }) as any)

      vi.mocked(stat).mockImplementation((path: any) => {
        if (path === '/usr/bin/godot') return Promise.resolve({ isFile: () => true, size: 100 } as any)
        return Promise.reject(new Error('ENOENT'))
      })

      const result = await detectGodot()
      expect(result).not.toBeNull()
      expect(result?.path).toBe('/usr/bin/godot')
      expect(result?.source).toBe('system')
    })

    it('should return null if no Godot found', async () => {
      delete process.env.GODOT_PATH
      vi.mocked(execFile).mockImplementation(((_cmd: any, _args: any, _options: any, callback: any) => {
        callback(new Error('not found'), { stdout: '', stderr: '' })
        return {} as any
      }) as any)

      vi.mocked(stat).mockRejectedValue(new Error('ENOENT'))
      vi.mocked(readdir).mockResolvedValue([])

      expect(await detectGodot()).toBeNull()
    })
  })
})
