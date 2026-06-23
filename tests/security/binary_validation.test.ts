import { execFile } from 'node:child_process'
import { access, open, stat } from 'node:fs/promises'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { tryGetVersion } from '../../src/godot/detector.js'
import { handleConfig } from '../../src/tools/composite/config.js'

// Mocking before imports
vi.mock('node:child_process', () => ({
  execFile: vi.fn(),
}))
vi.mock('node:fs/promises')

describe('Binary Validation Security', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // Default mock for stat to pass isExecutable and provide file size
    // biome-ignore lint/suspicious/noExplicitAny: mock
    vi.mocked(stat).mockResolvedValue({ isFile: () => true, size: 50 * 1024 * 1024 } as any)
    vi.mocked(access).mockResolvedValue(undefined)
  })

  it('should REJECT non-Godot binaries (like ls)', async () => {
    const maliciousPath = '/usr/bin/ls'
    // Mock open/read to return something that doesn't contain Godot signatures
    const mockHandle = {
      // biome-ignore lint/suspicious/noExplicitAny: mock
      stat: vi.fn().mockResolvedValue({ isFile: () => true, size: 50 * 1024 * 1024 } as any),
      read: vi.fn().mockImplementation((buffer: Buffer) => {
        buffer.write('standard linux binary content')
        return Promise.resolve({ bytesRead: 'standard linux binary content'.length })
      }),
      close: vi.fn().mockResolvedValue(undefined),
    }
    // biome-ignore lint/suspicious/noExplicitAny: mock
    vi.mocked(open).mockResolvedValue(mockHandle as any)

    const result = await tryGetVersion(maliciousPath)

    // Should NOT execute it
    expect(execFile).not.toHaveBeenCalled()
    expect(result).toBeNull()
  })

  it('should ACCEPT valid Godot binaries', async () => {
    const godotPath = '/usr/bin/godot'
    const mockHandle = {
      // biome-ignore lint/suspicious/noExplicitAny: mock
      stat: vi.fn().mockResolvedValue({ isFile: () => true, size: 50 * 1024 * 1024 } as any),
      read: vi.fn().mockImplementation((buffer: Buffer) => {
        buffer.write('some data... Godot Engine ... more data')
        return Promise.resolve({ bytesRead: buffer.length })
      }),
      close: vi.fn().mockResolvedValue(undefined),
    }
    // biome-ignore lint/suspicious/noExplicitAny: mock
    vi.mocked(open).mockResolvedValue(mockHandle as any)

    // biome-ignore lint/suspicious/noExplicitAny: mock
    vi.mocked(execFile).mockImplementation(((_path: any, _args: any, _options: any, callback: any) => {
      callback(null, { stdout: 'Godot Engine v4.1.stable', stderr: '' })
      // biome-ignore lint/suspicious/noExplicitAny: mock
      return {} as any
      // biome-ignore lint/suspicious/noExplicitAny: mock
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
    // biome-ignore lint/suspicious/noExplicitAny: mock
    vi.mocked(stat).mockResolvedValue({ isFile: () => true, size: 50 * 1024 * 1024 } as any)
    vi.mocked(access).mockResolvedValue(undefined)
  })

  it('should reject non-Godot binary when setting godot_path', async () => {
    const config = { godotPath: null, godotVersion: null, projectPath: null, activePids: [] }
    // config.ts uses tryGetVersion(value, true) which skips signature check and validates via --version.
    // Simulate a non-Godot binary: execFile returns error.
    // biome-ignore lint/suspicious/noExplicitAny: mock
    vi.mocked(execFile).mockImplementation(((_path: any, _args: any, _options: any, callback: any) => {
      callback(new Error('Command failed: /usr/bin/ls --version'), { stdout: '', stderr: '' })
      // biome-ignore lint/suspicious/noExplicitAny: mock
      return {} as any
      // biome-ignore lint/suspicious/noExplicitAny: mock
    }) as any)

    await expect(handleConfig('set', { key: 'godot_path', value: '/usr/bin/ls' }, config)).rejects.toThrow(
      'Invalid Godot binary',
    )

    expect(config.godotPath).toBeNull()
  })

  it('should accept valid Godot binary when setting godot_path', async () => {
    const config = { godotPath: null, godotVersion: null, projectPath: null, activePids: [] }
    const mockHandle = {
      // biome-ignore lint/suspicious/noExplicitAny: mock
      stat: vi.fn().mockResolvedValue({ isFile: () => true, size: 50 * 1024 * 1024 } as any),
      read: vi.fn().mockImplementation((buffer: Buffer) => {
        buffer.write('Godot Engine v4.1')
        return Promise.resolve({ bytesRead: buffer.length })
      }),
      close: vi.fn().mockResolvedValue(undefined),
    }
    // biome-ignore lint/suspicious/noExplicitAny: mock
    vi.mocked(open).mockResolvedValue(mockHandle as any)

    // biome-ignore lint/suspicious/noExplicitAny: mock
    vi.mocked(execFile).mockImplementation(((_path: any, _args: any, _options: any, callback: any) => {
      callback(null, { stdout: 'Godot Engine v4.1.stable', stderr: '' })
      // biome-ignore lint/suspicious/noExplicitAny: mock
      return {} as any
      // biome-ignore lint/suspicious/noExplicitAny: mock
    }) as any)

    await handleConfig('set', { key: 'godot_path', value: '/usr/bin/godot' }, config)

    expect(config.godotPath).toBe('/usr/bin/godot')
    expect(config.godotVersion?.major).toBe(4)
  })
})
