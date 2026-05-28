import { execFile } from 'node:child_process'
import { accessSync, existsSync, fstatSync, openSync, readdirSync, readSync, statSync } from 'node:fs'
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

vi.mock('node:fs', () => ({
  accessSync: vi.fn(),
  closeSync: vi.fn(),
  constants: { X_OK: 1 },
  existsSync: vi.fn(),
  fstatSync: vi.fn(),
  openSync: vi.fn(),
  readdirSync: vi.fn(),
  readSync: vi.fn(),
  statSync: vi.fn(),
}))

describe('detector', () => {
  describe('parseGodotVersion', () => {
    it('should parse standard Godot version strings', () => {
      const v = parseGodotVersion('Godot Engine v4.2.1.stable.official.755fa449c')
      expect(v).toEqual({
        major: 4,
        minor: 2,
        patch: 1,
        label: 'stable.official.755fa449c',
        raw: 'Godot Engine v4.2.1.stable.official.755fa449c',
      })
    })

    it('should parse simple version strings', () => {
      const v = parseGodotVersion('4.3.0')
      expect(v).toEqual({
        major: 4,
        minor: 3,
        patch: 0,
        label: 'stable',
        raw: '4.3.0',
      })
    })

    it('should handle dev/rc labels', () => {
      const v = parseGodotVersion('Godot Engine v4.4.dev1')
      expect(v?.label).toBe('dev1')
    })

    it('should return null for invalid strings', () => {
      expect(parseGodotVersion('not a version')).toBeNull()
    })
  })

  describe('isVersionSupported', () => {
    it('should support 4.1 and above', () => {
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
    it('should return true for executable files', () => {
      vi.mocked(statSync).mockReturnValue({ isFile: () => true } as unknown)
      vi.mocked(accessSync).mockReturnValue(undefined)
      expect(isExecutable('/path/to/godot')).toBe(true)
    })

    it('should return false for directories', () => {
      vi.mocked(statSync).mockReturnValue({ isFile: () => false } as unknown)
      expect(isExecutable('/path/to/dir')).toBe(false)
    })

    it('should return false for non-executable files', () => {
      vi.mocked(statSync).mockReturnValue({ isFile: () => true } as unknown)
      vi.mocked(accessSync).mockImplementation(() => {
        throw new Error('no access')
      })
      expect(isExecutable('/path/to/file')).toBe(false)
    })
  })

  describe('isLikelyGodotBinary', () => {
    beforeEach(() => {
      vi.clearAllMocks()
    })

    it('should detect Godot Engine signature', () => {
      const mockStats = { size: 1024 } as unknown
      vi.mocked(fstatSync).mockReturnValue(mockStats)
      vi.mocked(openSync).mockReturnValue(1)
      vi.mocked(readSync).mockImplementation((_fd, buffer) => {
        const b = buffer as Buffer
        b.write('Godot Engine')
        return 12
      })
      expect(isLikelyGodotBinary('/path/to/godot')).toBe(true)
    })

    it('should detect GDScript signature', () => {
      const mockStats = { size: 1024 } as unknown
      vi.mocked(fstatSync).mockReturnValue(mockStats)
      vi.mocked(openSync).mockReturnValue(1)
      vi.mocked(readSync).mockImplementation((_fd, buffer) => {
        const b = buffer as Buffer
        b.write('GDScript')
        return 8
      })
      expect(isLikelyGodotBinary('/path/to/godot')).toBe(true)
    })

    it('should return false if no signature found', () => {
      const mockStats = { size: 1024 } as unknown
      vi.mocked(fstatSync).mockReturnValue(mockStats)
      vi.mocked(openSync).mockReturnValue(1)
      vi.mocked(readSync).mockReturnValue(0)
      expect(isLikelyGodotBinary('/path/to/godot')).toBe(false)
    })
  })

  describe('tryGetVersion', () => {
    it('should return version if execFile succeeds', async () => {
      // Mock isLikelyGodotBinary to pass
      const mockStats = { isFile: () => true, size: 1024 } as unknown
      vi.mocked(fstatSync).mockReturnValue(mockStats)
      vi.mocked(openSync).mockReturnValue(1)
      vi.mocked(readSync).mockImplementation((_fd, buffer) => {
        const b = buffer as Buffer
        b.write('Godot Engine')
        return 12
      })

      vi.mocked(execFile).mockImplementation((_path, _args, _opts, callback) => {
        ;(callback as unknown)(null, { stdout: '4.2.1.stable', stderr: '' })
        return {} as unknown
      })

      const v = await tryGetVersion('/path/to/godot')
      expect(v).not.toBeNull()
      expect(v?.major).toBe(4)
      expect(v?.minor).toBe(2)
      expect(v?.patch).toBe(1)
    })

    it('should return null if execFile fails', async () => {
      const mockStats = { isFile: () => true, size: 1024 } as unknown
      vi.mocked(fstatSync).mockReturnValue(mockStats)
      vi.mocked(openSync).mockReturnValue(1)
      vi.mocked(readSync).mockImplementation((_fd, buffer) => {
        const b = buffer as Buffer
        b.write('Godot Engine')
        return 12
      })

      vi.mocked(execFile).mockImplementation((_path, _args, _opts, callback) => {
        ;(callback as unknown)(new Error('exec failed'), null)
        return {} as unknown
      })

      const v = await tryGetVersion('/path/to/godot')
      expect(v).toBeNull()
    })
  })

  describe('detectGodot', () => {
    const originalEnv = process.env
    const originalPlatform = process.platform

    beforeEach(() => {
      vi.clearAllMocks()
      process.env = { ...originalEnv }
      const mockStats = {
        isFile: () => true,
        size: 1024,
      } as unknown
      vi.mocked(statSync).mockReturnValue(mockStats)
      vi.mocked(fstatSync).mockReturnValue(mockStats)
      vi.mocked(accessSync).mockReturnValue(undefined)
      vi.mocked(openSync).mockReturnValue(999)
      vi.mocked(readSync).mockImplementation((_fd, buffer) => {
        const b = buffer as Buffer
        b.write('Godot Engine')
        return 12
      })
    })

    afterEach(() => {
      process.env = originalEnv
      Object.defineProperty(process, 'platform', { value: originalPlatform })
    })

    it('should detect from GODOT_PATH env var', async () => {
      process.env.GODOT_PATH = '/custom/path/godot'
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(execFile).mockImplementation((_path, _args, _opts, callback) => {
        ;(callback as unknown)(null, { stdout: 'Godot Engine v4.2.1.stable.official', stderr: '' })
        return {} as unknown
      })

      const result = await detectGodot()
      expect(result?.source).toBe('env')
      expect(result?.path).toBe('/custom/path/godot')
    })

    it('should detect from system PATH', async () => {
      delete process.env.GODOT_PATH
      // First call is 'which godot', second is 'godot --version'
      vi.mocked(execFile)
        .mockImplementationOnce((_path, _args, _opts, callback) => {
          ;(callback as unknown)(null, { stdout: '/usr/local/bin/godot\n', stderr: '' })
          return {} as unknown
        })
        .mockImplementationOnce((_path, _args, _opts, callback) => {
          ;(callback as unknown)(null, { stdout: 'Godot Engine v4.1.2.stable.official', stderr: '' })
          return {} as unknown
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

      // Fail path check (findInPath)
      vi.mocked(execFile).mockImplementation((_path, _args, _opts, callback) => {
        ;(callback as unknown)(new Error('not found'), null)
        return {} as unknown
      })

      vi.mocked(existsSync).mockImplementation((path) => path === '/usr/bin/godot')

      // Mock tryGetVersion for the system path
      vi.mocked(execFile).mockImplementation((path, _args, _opts, callback) => {
        if (path === '/usr/bin/godot') {
          ;(callback as unknown)(null, { stdout: 'Godot Engine v4.3.stable.official', stderr: '' })
        } else {
          ;(callback as unknown)(new Error('cmd not found'), null)
        }
        return {} as unknown
      })

      const result = await detectGodot()

      expect(result).not.toBeNull()
      expect(result?.path).toBe('/usr/bin/godot')
      expect(result?.source).toBe('system')
    })

    it('should return null if no Godot found', async () => {
      delete process.env.GODOT_PATH
      vi.mocked(execFile).mockImplementation((_path, _args, _opts, callback) => {
        ;(callback as unknown)(new Error('not found'), null)
        return {} as unknown
      })
      vi.mocked(existsSync).mockReturnValue(false)
      vi.mocked(statSync).mockImplementation(() => {
        throw new Error('ENOENT')
      })
      vi.mocked(readdirSync).mockImplementation(() => [] as unknown)

      expect(await detectGodot()).toBeNull()
    })
  })
})
