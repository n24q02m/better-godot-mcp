import * as child_process from 'node:child_process'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { execGodotSync } from '../../src/godot/headless.js'

vi.mock('node:child_process', () => ({
  execSync: vi.fn(() => 'success'),
  execFileSync: vi.fn(() => 'success'), // We expect this to be used after fix
  spawn: vi.fn(() => ({ unref: vi.fn(), pid: 123 })),
}))

describe('execGodotSync Security', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should use execFileSync instead of execSync to prevent command injection', () => {
    const godotPath = '/usr/bin/godot'
    const maliciousArg = '"; echo injected; "'
    const args = [maliciousArg]

    execGodotSync(godotPath, args)

    // After the fix, execFileSync should be called with the array of arguments
    expect(child_process.execFileSync).toHaveBeenCalledWith(
      godotPath,
      args,
      expect.objectContaining({ encoding: 'utf-8' }),
    )

    // And execSync should NOT be called
    expect(child_process.execSync).not.toHaveBeenCalled()
  })
})
