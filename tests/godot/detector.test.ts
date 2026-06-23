import { execFileSync } from 'node:child_process'
import type { PathLike } from 'node:fs'
import { accessSync, existsSync, fstatSync, openSync, readdirSync, readSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  detectGodot,
  isExecutable,
  isLikelyGodotBinary,
  isVersionSupported,
  parseGodotVersion,
  tryGetVersion,
} from '../../src/godot/detector.js'

vi.mock('node:child_process')
vi.mock('node:fs')

// Helper to mock readSync with ELF magic
const mockReadSyncWithELF = (buffer: Buffer | Uint8Array, offset?: number, length?: number, position?: number) => {
  const b = buffer as Buffer
  const off = offset ?? 0
  const pos = position ?? 0
  if (pos === 0) {
    b[off] = 0x7f; b[off+1] = 0x45; b[off+2] = 0x4c; b[off+3] = 0x46;
    return 4
  }
  return 0
}

describe('detector', () => {
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
      const v = parseGodotVersion('4.5.rc2')
      expect(v).not.toBeNull()
      expect(v?.major).toBe(4)
      expect(v?.minor).toBe(5)
      expect(v?.label).toBe('rc2')
    })

    it('should parse version with dev label', () => {
      const v = parseGodotVersion('4.6.dev')
      expect(v).not.toBeNull()
      expect(v?.major).toBe(4)
      expect(v?.minor).toBe(6)
      expect(v?.label).toBe('dev')
    })

    it('should parse mono version', () => {
      const v = parseGodotVersion('Godot Engine v4.2.stable.mono')
      expect(v).not.toBeNull()
      expect(v?.major).toBe(4)
      expect(v?.minor).toBe(2)
      expect(v?.label).toContain('stable.mono')
    })

    it('should return null for invalid string', () => {
      expect(parseGodotVersion('not a version')).toBeNull()
    })

    it('should return null for empty string', () => {
      expect(parseGodotVersion('')).toBeNull()
    })

    it('should capture raw string', () => {
      const v = parseGodotVersion('Godot Engine v4.1.stable')
      expect(v?.raw).toBe('Godot Engine v4.1.stable')
    })

    it('should trim raw string', () => {
      const v = parseGodotVersion('  Godot Engine v4.1.stable  ')
      expect(v?.raw).toBe('Godot Engine v4.1.stable')
    })

    it('should parse version with only major and minor', () => {
      const v = parseGodotVersion('v4.1')
      expect(v?.major).toBe(4)
      expect(v?.minor).toBe(1)
    })

    it('should parse version with just v prefix and numbers', () => {
      const v = parseGodotVersion('v4.1.2')
      expect(v?.major).toBe(4)
      expect(v?.minor).toBe(1)
      expect(v?.patch).toBe(2)
    })

    it('should parse simple version numbers without v', () => {
      const v = parseGodotVersion('4.1.0')
      expect(v?.major).toBe(4)
      expect(v?.minor).toBe(1)
    })

    it('should return null for incomplete version lacking minor', () => {
      expect(parseGodotVersion('4')).toBeNull()
      expect(parseGodotVersion('v4')).toBeNull()
    })

    it('should handle complex filenames as versions', () => {
      const v = parseGodotVersion('Godot_v4.1.2-stable_linux.x86_64')
      expect(v?.major).toBe(4)
      expect(v?.minor).toBe(1)
      expect(v?.patch).toBe(2)
      expect(v?.label).toBe('stable_linux.x86_64')
    })

    it('should return null for whitespace only', () => {
      expect(parseGodotVersion('   ')).toBeNull()
    })
  })

  describe('isVersionSupported', () => {
    it('should support 4.1 (minimum)', () => {
      expect(isVersionSupported({ major: 4, minor: 1, patch: 0, label: 'stable', raw: '4.1' })).toBe(true)
    })

    it('should support 4.6 (above minimum)', () => {
      expect(isVersionSupported({ major: 4, minor: 6, patch: 0, label: 'stable', raw: '4.6' })).toBe(true)
    })

    it('should NOT support 4.0 (below minimum minor)', () => {
      expect(isVersionSupported({ major: 4, minor: 0, patch: 0, label: 'stable', raw: '4.0' })).toBe(false)
    })

    it('should NOT support 3.x (old major)', () => {
      expect(isVersionSupported({ major: 3, minor: 9, patch: 0, label: 'stable', raw: '3.9' })).toBe(false)
    })

    it('should support 5.x (future major)', () => {
      expect(isVersionSupported({ major: 5, minor: 0, patch: 0, label: 'stable', raw: '5.0' })).toBe(true)
    })

    it('should support 4.1.3 (with patch)', () => {
      expect(isVersionSupported({ major: 4, minor: 1, patch: 3, label: 'stable', raw: '4.1.3' })).toBe(true)
    })
  })

  describe('isLikelyGodotBinary', () => {
    beforeEach(() => {
      vi.resetAllMocks()
      const mockStats = { isFile: () => true, size: 50 * 1024 * 1024 } as unknown as import('node:fs').Stats
      vi.mocked(fstatSync).mockReturnValue(mockStats)
      vi.mocked(statSync).mockReturnValue(mockStats)
      vi.mocked(openSync).mockReturnValue(123)
    })

    it('should return true when signature is in first chunk', () => {
      vi.mocked(readSync).mockImplementation((_fd, buffer, offset, length, position) => {
        const b = buffer as Buffer
        const off = offset ?? 0
        const pos = position ?? 0
        if (pos === 0) {
          b[off] = 0x7f; b[off+1] = 0x45; b[off+2] = 0x4c; b[off+3] = 0x46;
          b.write('Godot Engine', off + 4)
          return 16
        }
        return 0
      })
      expect(isLikelyGodotBinary('/usr/bin/godot')).toBe(true)
    })

    it('should return true when GDScript signature is found', () => {
      vi.mocked(readSync).mockImplementation((_fd, buffer, offset, length, position) => {
        const b = buffer as Buffer
        const off = offset ?? 0
        const pos = position ?? 0
        if (pos === 0) {
          b[off] = 0x7f; b[off+1] = 0x45; b[off+2] = 0x4c; b[off+3] = 0x46;
          b.write('GDScript', off + 4)
          return 12
        }
        return 0
      })
      expect(isLikelyGodotBinary('/usr/bin/godot')).toBe(true)
    })

    it('should scan multiple chunks for large binaries where signature is not in first chunk', () => {
      let callCount = 0
      vi.mocked(readSync).mockImplementation((_fd, buffer, offset, length, position) => {
        const b = buffer as Buffer
        const off = offset ?? 0
        const pos = position ?? 0
        callCount++
        if (pos === 0) {
          b[off] = 0x7f; b[off+1] = 0x45; b[off+2] = 0x4c; b[off+3] = 0x46;
          return 4
        }
        if (pos > 0 && pos < 10 * 1024 * 1024) {
          b.write('GDScript', off)
          return 8
        }
        return 0
      })
      expect(isLikelyGodotBinary('/usr/bin/godot-large')).toBe(true)
      expect(callCount).toBeGreaterThan(1)
    })

    it('should return false when no signature is found', () => {
      vi.mocked(readSync).mockImplementation(mockReadSyncWithELF)
      expect(isLikelyGodotBinary('/usr/bin/ls')).toBe(false)
    })

    it('should return false on read error', () => {
      vi.mocked(openSync).mockImplementation(() => { throw new Error('fail') })
      expect(isLikelyGodotBinary('/path/to/bad')).toBe(false)
    })

    it('should reject scripts starting with shebang', () => {
      vi.mocked(readSync).mockImplementation((_fd, buffer, offset, length, position) => {
        const b = buffer as Buffer
        const off = offset ?? 0
        const pos = position ?? 0
        if (pos === 0) {
          b[off] = 0x23; b[off+1] = 0x21; // #!
          return 2
        }
        return 0
      })
      expect(isLikelyGodotBinary('/path/to/script.sh')).toBe(false)
    })
  })

  describe('tryGetVersion', () => {
    beforeEach(() => {
      vi.resetAllMocks()
      const mockStats = { isFile: () => true, size: 50 * 1024 * 1024 } as unknown as import('node:fs').Stats
      vi.mocked(fstatSync).mockReturnValue(mockStats)
      vi.mocked(statSync).mockReturnValue(mockStats)
      vi.mocked(openSync).mockReturnValue(123)
      vi.mocked(accessSync).mockReturnValue(undefined)
    })

    it('should return version if signature and exec succeed', () => {
      vi.mocked(readSync).mockImplementation((_fd, buffer, offset, length, position) => {
        const b = buffer as Buffer
        const off = offset ?? 0
        const pos = position ?? 0
        if (pos === 0) {
          b[off] = 0x7f; b[off+1] = 0x45; b[off+2] = 0x4c; b[off+3] = 0x46;
          b.write('Godot Engine', off + 4)
          return 16
        }
        return 0
      })
      vi.mocked(execFileSync).mockReturnValue('4.2.1.stable')
      const v = tryGetVersion('/path/to/godot')
      expect(v).not.toBeNull()
      expect(v?.major).toBe(4)
    })

    it('should reject paths starting with hyphen', () => {
      expect(tryGetVersion(' -v')).toBeNull()
    })
  })

  describe('detectGodot', () => {
    const originalEnv = process.env
    const originalPlatform = process.platform

    beforeEach(() => {
      vi.clearAllMocks()
      process.env = { ...originalEnv }
      const mockStats = { isFile: () => true, size: 50 * 1024 * 1024 } as unknown as import('node:fs').Stats
      vi.mocked(statSync).mockReturnValue(mockStats)
      vi.mocked(fstatSync).mockReturnValue(mockStats)
      vi.mocked(accessSync).mockReturnValue(undefined)
      vi.mocked(openSync).mockReturnValue(999)
      vi.mocked(readSync).mockImplementation((_fd, buffer, offset, length, position) => {
        const b = buffer as Buffer
        const off = offset ?? 0
        const pos = position ?? 0
        if (pos === 0) {
          b[off] = 0x7f; b[off+1] = 0x45; b[off+2] = 0x4c; b[off+3] = 0x46;
          b.write('Godot Engine', off + 4)
          return 16
        }
        return 0
      })
    })

    afterEach(() => {
      process.env = originalEnv
      Object.defineProperty(process, 'platform', { value: originalPlatform })
    })

    it('should detect from GODOT_PATH env var', () => {
      process.env.GODOT_PATH = '/custom/path/godot'
      vi.mocked(existsSync).mockReturnValue(true)
      vi.mocked(execFileSync).mockReturnValue('Godot Engine v4.2.1.stable')

      const result = detectGodot()
      expect(result?.source).toBe('env')
      expect(result?.path).toBe('/custom/path/godot')
    })

    it('should detect from system PATH', () => {
      delete process.env.GODOT_PATH
      vi.mocked(execFileSync)
        .mockReturnValueOnce('/usr/local/bin/godot\n')
        .mockReturnValueOnce('Godot Engine v4.1.2.stable')
      vi.mocked(existsSync).mockReturnValue(true)

      const result = detectGodot()
      expect(result?.source).toBe('path')
      expect(result?.path).toBe('/usr/local/bin/godot')
    })
  })
})
