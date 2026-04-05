/**
 * Consolidated tests for headless.ts
 */

import * as child_process from 'node:child_process'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { execGodotAsync, execGodotSync, launchGodotEditor, runGodotProject } from '../../src/godot/headless.js'

// execFileAsyncMock is hoisted so it is available inside the vi.mock factory.
const { execFileAsyncMock } = vi.hoisted(() => ({
  execFileAsyncMock: vi.fn(),
}))

vi.mock('node:child_process', async () => {
  const { promisify: _promisify } = await import('node:util')
  const execFileMock = vi.fn()
  // Mock the promisified version of execFile
  ;(execFileMock as unknown as Record<symbol, unknown>)[_promisify.custom] = execFileAsyncMock
  return {
    spawnSync: vi.fn(),
    spawn: vi.fn(),
    execFile: execFileMock,
  }
})

describe('headless', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    execFileAsyncMock.mockReset()
  })

  // ==========================================
  // execGodotSync
  // ==========================================
  describe('execGodotSync', () => {
    it('executes Godot with correct arguments using spawnSync', () => {
      const godotPath = '/usr/bin/godot'
      const args = ['--version']
      const options = { timeout: 1000, cwd: '/tmp' }

      vi.mocked(child_process.spawnSync).mockReturnValue({
        stdout: '4.2.1',
        stderr: '',
        status: 0,
        output: [],
        pid: 0,
        signal: null,
      } as ReturnType<typeof child_process.spawnSync>)

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

    it('should use default timeout when not specified', () => {
      vi.mocked(child_process.spawnSync).mockReturnValue({
        stdout: 'output',
        stderr: '',
        status: 0,
        output: [],
        pid: 0,
        signal: null,
      } as ReturnType<typeof child_process.spawnSync>)
      const result = execGodotSync('/usr/bin/godot', ['--version'])
      expect(result.success).toBe(true)
      expect(child_process.spawnSync).toHaveBeenCalledWith(
        '/usr/bin/godot',
        ['--version'],
        expect.objectContaining({ timeout: 30_000 }),
      )
    })

    it('should handle execution errors with status code', () => {
      vi.mocked(child_process.spawnSync).mockReturnValue({
        stdout: '',
        stderr: 'Unknown argument',
        status: 1,
        output: [],
        pid: 0,
        signal: null,
      } as ReturnType<typeof child_process.spawnSync>)

      const result = execGodotSync('/usr/bin/godot', ['--invalid'])

      expect(result.success).toBe(false)
      expect(result.stderr).toBe('Unknown argument')
      expect(result.exitCode).toBe(1)
    })

    it('should handle error without status (fallback to 1)', () => {
      const error = new Error('Timeout')
      vi.mocked(child_process.spawnSync).mockReturnValue({
        error,
        status: null,
        stdout: '',
        stderr: '',
        output: [],
        pid: 0,
        signal: null,
      } as unknown as ReturnType<typeof child_process.spawnSync>)
      const result = execGodotSync('/usr/bin/godot', ['--version'])
      expect(result.success).toBe(false)
      expect(result.exitCode).toBe(1)
      expect(result.stderr).toBe('Timeout')
    })

    it('should handle error without stderr but with message', () => {
      const error = new Error('fail')
      vi.mocked(child_process.spawnSync).mockReturnValue({
        error,
        status: 2,
        stdout: '',
        stderr: '',
        output: [],
        pid: 0,
        signal: null,
      } as unknown as ReturnType<typeof child_process.spawnSync>)
      const result = execGodotSync('/usr/bin/godot', ['--version'])
      expect(result.success).toBe(false)
      expect(result.stderr).toBe('fail')
      expect(result.exitCode).toBe(2)
    })

    it('should handle error without stderr and without message', () => {
      vi.mocked(child_process.spawnSync).mockReturnValue({
        error: new Error(),
        status: 1,
        stdout: '',
        stderr: '',
        output: [],
        pid: 0,
        signal: null,
      } as unknown as ReturnType<typeof child_process.spawnSync>)
      const result = execGodotSync('/usr/bin/godot', ['--version'])
      expect(result.success).toBe(false)
      expect(result.stderr).toBe('Unknown error')
    })

    it('should handle success with empty stdout and stderr', () => {
      vi.mocked(child_process.spawnSync).mockReturnValue({
        stdout: '',
        stderr: '',
        status: 0,
        output: [],
        pid: 0,
        signal: null,
      } as ReturnType<typeof child_process.spawnSync>)
      const result = execGodotSync('/usr/bin/godot', ['--version'])
      expect(result.success).toBe(true)
      expect(result.stdout).toBe('')
      expect(result.stderr).toBe('')
    })

    it('should prevent command injection (security)', () => {
      const godotPath = '/usr/bin/godot'
      const args = [';', 'ls', '-la']

      vi.mocked(child_process.spawnSync).mockReturnValue({
        stdout: 'success',
        stderr: '',
        status: 0,
        output: [],
        pid: 0,
        signal: null,
      } as ReturnType<typeof child_process.spawnSync>)

      execGodotSync(godotPath, args)

      expect(child_process.spawnSync).toHaveBeenCalledWith(godotPath, args, expect.any(Object))
      expect(child_process.spawn).not.toHaveBeenCalled()
    })
  })

  // ==========================================
  // execGodotAsync
  // ==========================================
  describe('execGodotAsync', () => {
    it('should return success result with stdout and stderr trimmed', async () => {
      execFileAsyncMock.mockResolvedValue({ stdout: '  output  ', stderr: '  warn  ' })

      const result = await execGodotAsync('/usr/bin/godot', ['--version'])
      expect(result.success).toBe(true)
      expect(result.stdout).toBe('output')
      expect(result.stderr).toBe('warn')
      expect(result.exitCode).toBe(0)
    })

    it('should use default timeout of 30_000 when none specified', async () => {
      execFileAsyncMock.mockResolvedValue({ stdout: '', stderr: '' })

      await execGodotAsync('/usr/bin/godot', ['--version'])
      expect(execFileAsyncMock).toHaveBeenCalledWith(
        '/usr/bin/godot',
        ['--version'],
        expect.objectContaining({ timeout: 30_000 }),
      )
    })

    it('should return failure result with stdout, stderr and exitCode from error', async () => {
      const error = Object.assign(new Error('fail'), { stdout: '  out  ', stderr: '  err  ', code: 2 })
      execFileAsyncMock.mockRejectedValue(error)

      const result = await execGodotAsync('/usr/bin/godot', ['--version'])
      expect(result.success).toBe(false)
      expect(result.stdout).toBe('out')
      expect(result.stderr).toBe('err')
      expect(result.exitCode).toBe(2)
    })

    it('should fall back to error.message and exitCode 1 when error has no stdout/stderr/code', async () => {
      execFileAsyncMock.mockRejectedValue(new Error('command not found'))

      const result = await execGodotAsync('/usr/bin/godot', ['--version'])
      expect(result.success).toBe(false)
      expect(result.stderr).toBe('command not found')
      expect(result.exitCode).toBe(1)
    })

    it('should fall back to "Unknown error" when error has no message', async () => {
      execFileAsyncMock.mockRejectedValue({})

      const result = await execGodotAsync('/usr/bin/godot', ['--version'])
      expect(result.success).toBe(false)
      expect(result.stderr).toBe('Unknown error')
      expect(result.exitCode).toBe(1)
    })

    it('should return empty strings when success stdout and stderr are empty', async () => {
      execFileAsyncMock.mockResolvedValue({ stdout: '', stderr: '' })

      const result = await execGodotAsync('/usr/bin/godot', ['--version'])
      expect(result.success).toBe(true)
      expect(result.stdout).toBe('')
      expect(result.stderr).toBe('')
    })
  })

  // ==========================================
  // runGodotProject
  // ==========================================
  describe('runGodotProject', () => {
    it('should spawn Godot with correct arguments', () => {
      const mockChild = { unref: vi.fn(), pid: 42 }
      vi.mocked(child_process.spawn).mockReturnValue(mockChild as never)

      const result = runGodotProject('/usr/bin/godot', '/tmp/project')
      expect(result.pid).toBe(42)
      expect(child_process.spawn).toHaveBeenCalledWith('/usr/bin/godot', ['--path', '/tmp/project'], {
        detached: true,
        stdio: 'ignore',
      })
      expect(mockChild.unref).toHaveBeenCalled()
    })
  })

  // ==========================================
  // launchGodotEditor
  // ==========================================
  describe('launchGodotEditor', () => {
    it('should spawn Godot editor with --editor flag', () => {
      const mockChild = { unref: vi.fn(), pid: 99 }
      vi.mocked(child_process.spawn).mockReturnValue(mockChild as never)

      const result = launchGodotEditor('/usr/bin/godot', '/tmp/project')
      expect(result.pid).toBe(99)
      expect(child_process.spawn).toHaveBeenCalledWith('/usr/bin/godot', ['--editor', '--path', '/tmp/project'], {
        detached: true,
        stdio: 'ignore',
      })
      expect(mockChild.unref).toHaveBeenCalled()
    })
  })
})
