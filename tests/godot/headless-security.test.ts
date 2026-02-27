import * as cp from 'node:child_process'
import { describe, expect, it, vi } from 'vitest'
import { execGodotSync } from '../../src/godot/headless.js'

vi.mock('node:child_process', () => ({
  execFileSync: vi.fn().mockReturnValue('mock output'),
  spawn: vi.fn(),
}))

describe('headless-security', () => {
  it('should prevent command injection in args by using execFileSync', () => {
    const result = execGodotSync('godot', ['--version', '&&', 'echo', 'injected'])

    // It should use execFileSync which escapes the arguments properly
    expect(cp.execFileSync).toHaveBeenCalledWith('godot', ['--version', '&&', 'echo', 'injected'], expect.any(Object))
    expect(result.success).toBe(true)
    expect(result.stdout).toBe('mock output')
  })
})
