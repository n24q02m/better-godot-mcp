import { execFile } from 'node:child_process'
import { open, stat } from 'node:fs/promises'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { tryGetVersion } from '../../src/godot/detector.js'
import { handleConfig } from '../../src/tools/composite/config.js'

vi.mock('node:child_process', () => ({
  execFile: vi.fn(),
}))

vi.mock('node:fs/promises', () => ({
  open: vi.fn(),
  stat: vi.fn(),
  access: vi.fn().mockResolvedValue(undefined),
}))

vi.mock('node:fs', () => ({
  existsSync: vi.fn(),
  constants: {
    X_OK: 1,
  },
}))

describe('Binary Validation Security', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // Default mock for stat to pass isExecutable and provide file size
    const mockStats = { isFile: () => true, size: 50 * 1024 * 1024 } as any
    vi.mocked(stat).mockResolvedValue(mockStats)
  })

  it('should REJECT non-Godot binaries (like ls)', async () => {
    const maliciousPath = '/usr/bin/ls'
    // Mock handle.read to return something that doesn't contain Godot signatures
    const mockHandle = {
      stat: vi.fn().mockResolvedValue({ size: 50 * 1024 * 1024 }),
      read: vi.fn().mockImplementation((buffer: Buffer) => {
        buffer.write('standard linux binary content')
        return Promise.resolve({ bytesRead: 'standard linux binary content'.length })
      }),
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
      stat: vi.fn().mockResolvedValue({ size: 50 * 1024 * 1024 }),
      read: vi.fn().mockImplementation((buffer: Buffer) => {
        buffer.write('some data... Godot Engine ... more data')
        return Promise.resolve({ bytesRead: buffer.length })
      }),
      close: vi.fn().mockResolvedValue(undefined),
    }
    vi.mocked(open).mockResolvedValue(mockHandle as any)
    vi.mocked(execFile).mockImplementation((_cmd, _args, _opts, callback: any) => {
      callback(null, { stdout: 'Godot Engine v4.1.stable' })
    })

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
    const mockStats = { isFile: () => true, size: 50 * 1024 * 1024 } as any
    vi.mocked(stat).mockResolvedValue(mockStats)
  })

  it('should reject non-Godot binary when setting godot_path', async () => {
    const config = { godotPath: null, godotVersion: null, projectPath: null, activePids: [] } as any
    // config.ts uses tryGetVersion(value, true) which skips signature check and validates via --version.
    // Simulate a non-Godot binary: execFile returns error (binary does not support --version flag).
    vi.mocked(execFile).mockImplementation((_cmd, _args, _opts, callback: any) => {
      callback(new Error('Command failed: /usr/bin/ls --version'))
    })

    await expect(handleConfig('set', { key: 'godot_path', value: '/usr/bin/ls' }, config)).rejects.toThrow(
      'Invalid Godot binary',
    )

    expect(config.godotPath).toBeNull()
  })

  it('should accept valid Godot binary when setting godot_path', async () => {
    const config = { godotPath: null, godotVersion: null, projectPath: null, activePids: [] } as any
    const mockHandle = {
      stat: vi.fn().mockResolvedValue({ size: 50 * 1024 * 1024 }),
      read: vi.fn().mockImplementation((buffer: Buffer) => {
        buffer.write('Godot Engine v4.1')
        return Promise.resolve({ bytesRead: buffer.length })
      }),
      close: vi.fn().mockResolvedValue(undefined),
    }
    vi.mocked(open).mockResolvedValue(mockHandle as any)
    vi.mocked(execFile).mockImplementation((_cmd, _args, _opts, callback: any) => {
      callback(null, { stdout: 'Godot Engine v4.1.stable' })
    })

    await handleConfig('set', { key: 'godot_path', value: '/usr/bin/godot' }, config)

    expect(config.godotPath).toBe('/usr/bin/godot')
    expect(config.godotVersion?.major).toBe(4)
  })
})
