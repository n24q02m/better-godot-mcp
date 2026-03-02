import * as child_process from 'node:child_process'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { execGodotSync } from '../../src/godot/headless.js'

// Mock execFileSync
vi.mock('node:child_process', () => {
  return {
    execFileSync: vi.fn(),
    spawn: vi.fn(),
  }
})

describe('execGodotSync', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it('executes Godot with correct arguments using execFileSync (secure version)', () => {
    const godotPath = '/usr/bin/godot'
    const args = ['--version']
    const options = { timeout: 1000, cwd: '/tmp' }

    // Mock successful execution
    vi.mocked(child_process.execFileSync).mockReturnValue('4.2.1')

    const result = execGodotSync(godotPath, args, options)

    expect(result.success).toBe(true)
    expect(result.stdout).toBe('4.2.1')
    expect(child_process.execFileSync).toHaveBeenCalledWith(
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

    vi.mocked(child_process.execFileSync).mockImplementation(() => {
      throw error
    })

    const result = execGodotSync(godotPath, args)

    expect(result.success).toBe(false)
    expect(result.stderr).toBe('Unknown argument')
    expect(result.exitCode).toBe(1)
  })

  it('handles primitive string errors', () => {
    const godotPath = '/usr/bin/godot'
    const args = ['--invalid']

    // Mock primitive string error
    vi.mocked(child_process.execFileSync).mockImplementation(() => {
      throw 'Unknown error string'
    })

    const result = execGodotSync(godotPath, args)

    expect(result.success).toBe(false)
    expect(result.stderr).toBe('Unknown error')
    expect(result.exitCode).toBe(1)
  })

  it('handles execution errors with no status or message', () => {
    const godotPath = '/usr/bin/godot'
    const args = ['--invalid']

    // Mock execution error without status/message
    const error = {}
    vi.mocked(child_process.execFileSync).mockImplementation(() => {
      throw error
    })

    const result = execGodotSync(godotPath, args)

    expect(result.success).toBe(false)
    expect(result.stderr).toBe('Unknown error')
    expect(result.exitCode).toBe(1)
  })

  it('handles execution errors with only a message', () => {
    const godotPath = '/usr/bin/godot'
    const args = ['--invalid']

    // Mock execution error with only a message
    const error = new Error('Just a message')
    vi.mocked(child_process.execFileSync).mockImplementation(() => {
      throw error
    })

    const result = execGodotSync(godotPath, args)

    expect(result.success).toBe(false)
    expect(result.stderr).toBe('Just a message')
    expect(result.exitCode).toBe(1)
  })
})
