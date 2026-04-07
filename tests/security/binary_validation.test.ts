import * as child_process from 'node:child_process'
import * as fs from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { GodotConfig } from '../../src/godot/types.js'
import { handleConfig } from '../../src/tools/composite/config.js'

// Mock dependencies
vi.mock('node:child_process', () => ({
  execFileSync: vi.fn(),
}))

vi.mock('node:fs', () => ({
  statSync: vi.fn(),
  accessSync: vi.fn(),
  constants: { X_OK: 1 },
}))

vi.mock('../../src/tools/helpers/paths.js', () => ({
  pathExists: vi.fn(),
}))

describe('Security: Binary Validation', () => {
  const config: GodotConfig = {
    godotPath: null,
    godotVersion: null,
    projectPath: null,
    activePids: [],
  }

  beforeEach(() => {
    vi.resetAllMocks()
    // Default to a regular executable
    vi.mocked(fs.statSync).mockReturnValue({ isFile: () => true } as unknown as string)
    vi.mocked(fs.accessSync).mockReturnValue(undefined)
  })

  it('should reject non-Godot binaries (like ls)', async () => {
    // Simulate 'ls --version' output
    vi.mocked(child_process.execFileSync).mockReturnValue('ls (GNU coreutils) 9.1\n' as unknown as string)

    await expect(handleConfig('set', { key: 'godot_path', value: '/usr/bin/ls' }, config)).rejects.toThrow(
      'Invalid Godot binary',
    )

    expect(config.godotPath).toBeNull()
  })

  it('should reject generic "v1.2.3" version strings from other tools', async () => {
    // Simulate 'node --version' output
    vi.mocked(child_process.execFileSync).mockReturnValue('v20.10.0\n' as unknown as string)

    await expect(handleConfig('set', { key: 'godot_path', value: '/usr/bin/node' }, config)).rejects.toThrow(
      'Invalid Godot binary',
    )
  })

  it('should accept valid Godot version strings', async () => {
    // Simulate 'godot --version' output
    vi.mocked(child_process.execFileSync).mockReturnValue('Godot Engine v4.3.stable.official\n' as unknown as string)

    const result = await handleConfig('set', { key: 'godot_path', value: '/usr/bin/godot' }, config)

    expect(result.isError).toBeFalsy()
    expect(config.godotPath).toBe('/usr/bin/godot')
    expect(config.godotVersion?.major).toBe(4)
  })

  it('should accept complex Godot build filenames', async () => {
    vi.mocked(child_process.execFileSync).mockReturnValue('Godot_v4.3-stable_win64_console.exe\n' as unknown as string)

    await handleConfig('set', { key: 'godot_path', value: 'C:\\Godot.exe' }, config)
    expect(config.godotPath).toBe('C:\\Godot.exe')
  })

  it('should reject binaries that return version but are not likely Godot', async () => {
    // A binary that returns a version-like string but doesn't mention Godot and isn't a known Godot version
    vi.mocked(child_process.execFileSync).mockReturnValue('1.2.3\n' as unknown as string)

    await expect(handleConfig('set', { key: 'godot_path', value: '/usr/bin/fake' }, config)).rejects.toThrow(
      'Invalid Godot binary',
    )
  })
})
