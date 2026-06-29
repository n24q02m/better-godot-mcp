import { execFile } from 'node:child_process'
import { access, open, stat } from 'node:fs/promises'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { tryGetVersion } from '../../src/godot/detector.js'
import type { GodotConfig } from '../../src/godot/types.js'
import { handleConfig } from '../../src/tools/composite/config.js'

vi.mock('node:child_process', () => ({
  execFile: vi.fn(),
}))
vi.mock('node:fs/promises')
vi.mock('node:fs', () => ({
  existsSync: vi.fn().mockReturnValue(true),
  constants: { X_OK: 1 },
}))

describe('Binary Validation Security', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // Default mock for stat to pass isExecutable and provide file size
    const mockStats = { isFile: () => true, size: 50 * 1024 * 1024 } as unknown as import('node:fs').Stats
    vi.mocked(stat).mockResolvedValue(mockStats)
    vi.mocked(access).mockResolvedValue(undefined)
  })

  it('should REJECT non-Godot binaries (like ls)', async () => {
    const maliciousPath = '/usr/bin/ls'
    const mockHandle = {
      stat: vi.fn().mockResolvedValue({ size: 1024 }),
      read: vi.fn().mockResolvedValue({ bytesRead: 100 }),
      close: vi.fn().mockResolvedValue(undefined),
    }
    vi.mocked(open).mockResolvedValue(mockHandle as any)

    const result = await tryGetVersion(maliciousPath)

    // Should NOT execute it
    expect(execFile).not.toHaveBeenCalled()
    expect(result).toBeNull()
  })

  it('should ACCEPT valid Godot binaries', async () => {
    const godotPath = '/usr/bin/godot'
    const mockHandle = {
      stat: vi.fn().mockResolvedValue({ size: 1024 }),
      read: vi.fn().mockImplementation((buf: Buffer) => {
        buf.write('Godot Engine')
        return Promise.resolve({ bytesRead: 12 })
      }),
      close: vi.fn().mockResolvedValue(undefined),
    }
    vi.mocked(open).mockResolvedValue(mockHandle as any)
    vi.mocked(execFile).mockImplementation(((_path, _args, _options, callback: any) => {
      callback(null, { stdout: 'Godot Engine v4.1.stable' })
    }) as any)

    const result = await tryGetVersion(godotPath)

    // Should execute it to get version
    expect(execFile).toHaveBeenCalledWith(godotPath, ['--version'], expect.any(Object), expect.any(Function))
    expect(result).not.toBeNull()
    expect(result?.major).toBe(4)
  })

  it('should handle file read errors gracefully', async () => {
    const errorPath = '/tmp/error_file'
    vi.mocked(open).mockRejectedValue(new Error('Read error'))

    const result = await tryGetVersion(errorPath)
    expect(result).toBeNull()
    expect(execFile).not.toHaveBeenCalled()
  })
})

describe('handleConfig Security', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    const mockStats = { isFile: () => true, size: 50 * 1024 * 1024 } as unknown as import('node:fs').Stats
    vi.mocked(stat).mockResolvedValue(mockStats)
    vi.mocked(access).mockResolvedValue(undefined)
  })

  it('should reject non-Godot binary when setting godot_path', async () => {
    const config: GodotConfig = { godotPath: null, godotVersion: null, projectPath: null, activePids: [] }

    vi.mocked(execFile).mockImplementation(((_path, _args, _options, callback: any) => {
      callback(new Error('Command failed'))
    }) as any)

    await expect(handleConfig('set', { key: 'godot_path', value: '/usr/bin/ls' }, config)).rejects.toThrow(
      'Invalid Godot binary',
    )

    expect(config.godotPath).toBeNull()
  })

  it('should accept valid Godot binary when setting godot_path', async () => {
    const config: GodotConfig = { godotPath: null, godotVersion: null, projectPath: null, activePids: [] }
    const mockHandle = {
      stat: vi.fn().mockResolvedValue({ size: 1024 }),
      read: vi.fn().mockImplementation((buf: Buffer) => {
        buf.write('Godot Engine')
        return Promise.resolve({ bytesRead: 12 })
      }),
      close: vi.fn().mockResolvedValue(undefined),
    }
    vi.mocked(open).mockResolvedValue(mockHandle as any)
    vi.mocked(execFile).mockImplementation(((_path, _args, _options, callback: any) => {
      callback(null, { stdout: 'Godot Engine v4.1.stable' })
    }) as any)

    await handleConfig('set', { key: 'godot_path', value: '/usr/bin/godot' }, config)

    expect(config.godotPath).toBe('/usr/bin/godot')
    expect(config.godotVersion?.major).toBe(4)
  })
})
