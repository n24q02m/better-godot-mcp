import { execFileSync } from 'node:child_process'
import { fstatSync, openSync, readSync, statSync } from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { tryGetVersion } from '../../src/godot/detector.js'
import { handleConfig } from '../../src/tools/composite/config.js'

vi.mock('node:child_process')
vi.mock('node:fs')

describe('Binary Validation Security', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    // Default mock for statSync/fstatSync to pass isExecutable and provide file size
    const mockStats = { isFile: () => true, size: 50 * 1024 * 1024 } as unknown as import('node:fs').Stats
    vi.mocked(statSync).mockReturnValue(mockStats)
    vi.mocked(fstatSync).mockReturnValue(mockStats)
  })

  it('should REJECT non-Godot binaries (like ls)', () => {
    const maliciousPath = '/usr/bin/ls'
    vi.mocked(openSync).mockReturnValue(123)
    vi.mocked(readSync).mockImplementation((_fd, buffer: Buffer, offset: number, length: number, position: number) => {
      if (position === 0) {
        // ELF magic but not Godot
        buffer[0] = 0x7f; buffer[1] = 0x45; buffer[2] = 0x4c; buffer[3] = 0x46;
        return 4;
      }
      buffer.write('standard linux binary content', offset)
      return 'standard linux binary content'.length
    })

    const result = tryGetVersion(maliciousPath)

    // Should NOT execute it because it lacks Godot signatures
    expect(execFileSync).not.toHaveBeenCalled()
    expect(result).toBeNull()
  })

  it('should REJECT scripts even with Godot strings', () => {
    const scriptPath = './script.sh'
    vi.mocked(openSync).mockReturnValue(123)
    vi.mocked(readSync).mockImplementation((_fd, buffer: Buffer, offset: number, length: number, position: number) => {
      if (position === 0) {
        // Shebang magic
        buffer[0] = 0x23; buffer[1] = 0x21;
        return 2;
      }
      buffer.write('Godot Engine', offset)
      return 12;
    })

    const result = tryGetVersion(scriptPath)
    expect(result).toBeNull()
    expect(execFileSync).not.toBeCalled()
  })

  it('should ACCEPT valid Godot binaries', () => {
    const godotPath = '/usr/bin/godot'
    vi.mocked(openSync).mockReturnValue(124)
    vi.mocked(readSync).mockImplementation((_fd, buffer: Buffer, offset: number, length: number, position: number) => {
      if (position === 0) {
        // ELF magic
        buffer[0] = 0x7f; buffer[1] = 0x45; buffer[2] = 0x4c; buffer[3] = 0x46;
        if (length > 4) {
           buffer.write('Godot Engine', offset + 4)
           return 16
        }
        return 4
      }
      buffer.write('some data... Godot Engine ... more data', offset)
      return length
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
  beforeEach(() => {
    vi.resetAllMocks()
    const mockStats = { isFile: () => true, size: 50 * 1024 * 1024 } as unknown as import('node:fs').Stats
    vi.mocked(statSync).mockReturnValue(mockStats)
    vi.mocked(fstatSync).mockReturnValue(mockStats)
  })

  it('should reject non-Godot binary when setting godot_path', async () => {
    const config = { godotPath: null, godotVersion: null, projectPath: null, activePids: [] }
    vi.mocked(openSync).mockReturnValue(125)
    vi.mocked(readSync).mockImplementation((_fd, buffer: Buffer, offset: number, length: number, position: number) => {
       if (position === 0) {
         buffer[0] = 0x7f; buffer[1] = 0x45; buffer[2] = 0x4c; buffer[3] = 0x46;
         return 4
       }
       return 0
    })

    await expect(handleConfig('set', { key: 'godot_path', value: '/usr/bin/ls' }, config)).rejects.toThrow(
      'Invalid Godot binary',
    )

    expect(config.godotPath).toBeNull()
  })

  it('should accept valid Godot binary when setting godot_path', async () => {
    const config = { godotPath: null, godotVersion: null, projectPath: null, activePids: [] }
    vi.mocked(openSync).mockReturnValue(126)
    vi.mocked(readSync).mockImplementation((_fd, buffer: Buffer, offset: number, length: number, position: number) => {
      if (position === 0) {
        // ELF magic
        buffer[0] = 0x7f; buffer[1] = 0x45; buffer[2] = 0x4c; buffer[3] = 0x46;
        if (length > 4) {
           buffer.write('Godot Engine v4.1', offset + 4)
           return 21
        }
        return 4
      }
      buffer.write('Godot Engine v4.1', offset)
      return length
    })
    vi.mocked(execFileSync).mockReturnValue('Godot Engine v4.1.stable')

    await handleConfig('set', { key: 'godot_path', value: '/usr/bin/godot' }, config)

    expect(config.godotPath).toBe('/usr/bin/godot')
    expect(config.godotVersion?.major).toBe(4)
  })
})
