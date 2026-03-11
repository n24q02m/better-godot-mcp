import * as child_process from 'node:child_process'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { execGodotSync } from '../../src/godot/headless.js'

// Mock spawnSync
vi.mock('node:child_process', () => {
  return {
    spawnSync: vi.fn(),
    spawn: vi.fn(),
  }
})

describe('execGodotSync', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('executes Godot with correct arguments using spawnSync (secure version)', () => {
    const godotPath = '/usr/bin/godot'
    const args = ['--version']
    const options = { timeout: 1000, cwd: '/tmp' }

    // Mock successful execution
    vi.mocked(child_process.spawnSync).mockReturnValue({ stdout: '4.2.1', stderr: '', status: 0 })

    const result = execGodotSync(godotPath, args, options)

    expect(result.success).toBe(true)
    expect(result.stdout).toBe('4.2.1')
    expect(child_process.spawnSync).toHaveBeenCalledWith(
      godotPath,
      args,
      expect.objectContaining({
        timeout: options.timeout,
        cwd: options.cwd,
        encoding: 'utf-8',
      }),
    )
  })

  it('handles execution errors', () => {
    const godotPath = '/usr/bin/godot'
    const args = ['--invalid']

    // Mock execution error
    const error = new Error('Command failed')
    Object.assign(error, {
      status: 1,
      stdout: '',
      stderr: 'Unknown argument',
    })

    vi.mocked(child_process.spawnSync).mockReturnValue({
      error,
      status: error.status ?? 1,
      stdout: error.stdout ?? '',
      stderr: error.stderr ?? '',
    })

    const result = execGodotSync(godotPath, args)

    expect(result.success).toBe(false)
    expect(result.stderr).toBe('Unknown argument')
    expect(result.exitCode).toBe(1)
  })
})
