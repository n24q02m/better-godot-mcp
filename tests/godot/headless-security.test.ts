import * as childProcess from 'node:child_process'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { execGodotSync } from '../../src/godot/headless.js'

vi.mock('node:child_process')

describe('execGodotSync Security', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
  })

  it('should use spawnSync instead of spawnSync to prevent command injection', () => {
    const godotPath = '/usr/bin/godot'
    const args = ['--headless', '--script', 'test.gd']

    // Because we use vi.mock('node:child_process'), spawnSync will just be a mocked function
    // returning what we tell it to. It won't actually try to spawn the file.
    vi.mocked(childProcess.spawnSync).mockReturnValue({ stdout: 'success', stderr: '', status: 0 })

    const result = execGodotSync(godotPath, args)

    expect(result.success).toBe(true)
    expect(result.stdout).toBe('success')

    // Verify spawnSync is called, not spawnSync
    expect(childProcess.spawnSync).toHaveBeenCalledTimes(1)
    expect(childProcess.spawn).not.toHaveBeenCalled()

    // Verify arguments are passed as array to spawnSync, which prevents command injection
    expect(childProcess.spawnSync).toHaveBeenCalledWith(godotPath, args, expect.any(Object))
  })

  it('should safely handle malicious arguments without executing them as shell commands', () => {
    const godotPath = '/usr/bin/godot'
    // A malicious payload that would execute `ls` if passed to a shell
    const maliciousArgs = ['--headless', '--script', 'test.gd', ';', 'ls', '-la']

    vi.mocked(childProcess.spawnSync).mockReturnValue({ stdout: 'success', stderr: '', status: 0 })

    execGodotSync(godotPath, maliciousArgs)

    // Verify the malicious arguments are passed exactly as array elements
    // In spawnSync, these are passed directly to the executable (Godot)
    // rather than being parsed by a shell like `/bin/sh -c "/usr/bin/godot --headless --script test.gd ; ls -la"`
    expect(childProcess.spawnSync).toHaveBeenCalledWith(
      godotPath,
      ['--headless', '--script', 'test.gd', ';', 'ls', '-la'],
      expect.any(Object),
    )
  })
})
