import { execFile } from 'node:child_process'
import { fstatSync, openSync, readSync, statSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { tryGetVersion } from '../../src/godot/detector.js'
import { handleConfig } from '../../src/tools/composite/config.js'

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

describe('Binary Validation Security', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // Default mock for statSync/fstatSync to pass isExecutable and provide file size
    const mockStats = { isFile: () => true, size: 50 * 1024 * 1024 } as unknown as import('node:fs').Stats
    vi.mocked(statSync).mockReturnValue(mockStats)
    vi.mocked(fstatSync).mockReturnValue(mockStats)
  })

  it('should REJECT non-Godot binaries (like ls)', async () => {
    const maliciousPath = '/usr/bin/ls'
    // Mock readSync to return something that doesn't contain Godot signatures
    vi.mocked(openSync).mockReturnValue(123)
    vi.mocked(readSync).mockImplementation((_fd, buffer: Buffer) => {
      buffer.write('standard linux binary content')
      return 'standard linux binary content'.length
    })

    const result = await tryGetVersion(maliciousPath)

    // Should NOT execute it
    expect(execFile).not.toHaveBeenCalled()
    expect(result).toBeNull()
  })

  it('should ACCEPT valid Godot binaries', async () => {
    const godotPath = '/usr/bin/godot'
    vi.mocked(openSync).mockReturnValue(124)
    vi.mocked(readSync).mockImplementation((_fd, buffer: Buffer) => {
      buffer.write('some data... Godot Engine ... more data')
      return buffer.length
    })
    vi.mocked(execFile).mockImplementation((_path, _args, _opts, callback) => {
      ;(callback as unknown)(null, { stdout: 'Godot Engine v4.1.stable', stderr: '' })
      return {} as unknown
    })

    const result = await tryGetVersion(godotPath)

    // Should execute it to get version
    expect(execFile).toHaveBeenCalledWith(godotPath, ['--version'], expect.any(Object), expect.any(Function))
    expect(result).not.toBeNull()
    expect(result?.major).toBe(4)
  })

  it('should handle file read errors gracefully', async () => {
    const errorPath = '/tmp/error_file'
    vi.mocked(openSync).mockImplementation(() => {
      throw new Error('Read error')
    })

    const result = await tryGetVersion(errorPath)
    expect(result).toBeNull()
    expect(execFile).not.toHaveBeenCalled()
  })
})

describe('handleConfig Security', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    const mockStats = { isFile: () => true, size: 50 * 1024 * 1024 } as unknown as import('node:fs').Stats
    vi.mocked(statSync).mockReturnValue(mockStats)
    vi.mocked(fstatSync).mockReturnValue(mockStats)
  })

  it('should reject non-Godot binary when setting godot_path', async () => {
    const config = { godotPath: null, godotVersion: null, projectPath: null, activePids: [] }
    // config.ts uses tryGetVersion(value, true) which skips signature check and validates via --version.
    // Simulate a non-Godot binary: execFile throws (binary does not support --version flag).
    vi.mocked(execFile).mockImplementation((_path, _args, _opts, callback) => {
      ;(callback as unknown)(new Error('Command failed: /usr/bin/ls --version'), null)
      return {} as unknown
    })

    await expect(handleConfig('set', { key: 'godot_path', value: '/usr/bin/ls' }, config)).rejects.toThrow(
      'Invalid Godot binary',
    )

    expect(config.godotPath).toBeNull()
  })

  it('should accept valid Godot binary when setting godot_path', async () => {
    const config = { godotPath: null, godotVersion: null, projectPath: null, activePids: [] }
    vi.mocked(openSync).mockReturnValue(126)
    vi.mocked(readSync).mockImplementation((_fd, buffer: Buffer) => {
      buffer.write('Godot Engine v4.1')
      return buffer.length
    })
    vi.mocked(execFile).mockImplementation((_path, _args, _opts, callback) => {
      ;(callback as unknown)(null, { stdout: 'Godot Engine v4.1.stable', stderr: '' })
      return {} as unknown
    })

    await handleConfig('set', { key: 'godot_path', value: '/usr/bin/godot' }, config)

    expect(config.godotPath).toBe('/usr/bin/godot')
    expect(config.godotVersion?.major).toBe(4)
  })
})
