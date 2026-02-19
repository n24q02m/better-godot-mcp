import { execFileSync, execSync } from 'node:child_process'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { execGodotSync } from '../../src/godot/headless.js'

vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
  execFileSync: vi.fn(),
  spawn: vi.fn(),
}))

describe('execGodotSync', () => {
  const godotPath = '/usr/bin/godot'
  const args = ['--version']

  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('should call execFileSync with correct arguments', () => {
    vi.mocked(execFileSync).mockReturnValue('4.3.stable')
    // Mock execSync as well to prevent errors if the code still uses it during transition
    vi.mocked(execSync).mockReturnValue('4.3.stable')

    const result = execGodotSync(godotPath, args)

    // We expect execFileSync to be called after refactor
    // For now, this assertion will fail, which is expected for TDD
    expect(execFileSync).toHaveBeenCalledWith(godotPath, args, expect.objectContaining({
      timeout: 30000,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
    }))

    expect(result.success).toBe(true)
    expect(result.stdout).toBe('4.3.stable')
  })

  it('should handle execution errors', () => {
    const error = new Error('Command failed') as any
    error.status = 1
    error.stdout = ''
    error.stderr = 'Error executing command'

    vi.mocked(execFileSync).mockImplementation(() => {
      throw error
    })
    // Mock execSync to throw as well
    vi.mocked(execSync).mockImplementation(() => {
      throw error
    })

    const result = execGodotSync(godotPath, args)

    expect(result.success).toBe(false)
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toBe('Error executing command')
  })
})
