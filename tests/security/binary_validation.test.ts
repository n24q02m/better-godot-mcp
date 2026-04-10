import { execFileSync } from 'node:child_process'
import { openSync, readSync, statSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { tryGetVersion } from '../../src/godot/detector.js'
import { handleConfig } from '../../src/tools/composite/config.js'

vi.mock('node:child_process')
vi.mock('node:fs')

describe('Binary Validation Security', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Default mock for statSync to pass isExecutable
    vi.mocked(statSync).mockReturnValue({ isFile: () => true } as unknown as import('node:fs').Stats)
  })

  it('should REJECT non-Godot binaries (like ls)', () => {
    const maliciousPath = '/usr/bin/ls'
    // Mock readSync to return something that doesn't contain Godot signatures
    vi.mocked(openSync).mockReturnValue(123)
    vi.mocked(readSync).mockImplementation((_fd, buffer: Buffer) => {
      buffer.write('standard linux binary content')
      return 'standard linux binary content'.length
    })

    const result = tryGetVersion(maliciousPath)

    // Should NOT execute it
    expect(execFileSync).not.toHaveBeenCalled()
    expect(result).toBeNull()
  })

  it('should ACCEPT valid Godot binaries', () => {
    const godotPath = '/usr/bin/godot'
    vi.mocked(openSync).mockReturnValue(124)
    vi.mocked(readSync).mockImplementation((_fd, buffer: Buffer) => {
      buffer.write('some data... Godot Engine ... more data')
      return buffer.length
    })
    vi.mocked(execFileSync).mockReturnValue('Godot Engine v4.1.stable')

    const result = tryGetVersion(godotPath)

    // Should execute it to get version
    expect(execFileSync).toHaveBeenCalledWith(godotPath, ['--version'], expect.any(Object))
    expect(result).not.toBeNull()
    expect(result?.major).toBe(4)
  })

  it('should handle file read errors gracefully', () => {
    const errorPath = '/tmp/error_file'
    vi.mocked(openSync).mockImplementation(() => {
      throw new Error('Read error')
    })

    const result = tryGetVersion(errorPath)
    expect(result).toBeNull()
    expect(execFileSync).not.toHaveBeenCalled()
  })
})

describe('handleConfig Security', () => {
  it('should reject non-Godot binary when setting godot_path', async () => {
    const config = { godotPath: null, godotVersion: null, projectPath: null, activePids: [] }
    vi.mocked(openSync).mockReturnValue(125)
    vi.mocked(readSync).mockImplementation((_fd, buffer: Buffer) => {
      buffer.write('not a godot binary')
      return 'not a godot binary'.length
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
    vi.mocked(execFileSync).mockReturnValue('Godot Engine v4.1.stable')

    await handleConfig('set', { key: 'godot_path', value: '/usr/bin/godot' }, config)

    expect(config.godotPath).toBe('/usr/bin/godot')
    expect(config.godotVersion?.major).toBe(4)
  })
})
