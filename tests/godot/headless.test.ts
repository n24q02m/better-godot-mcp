import * as child_process from 'node:child_process'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { execGodotAsync, execGodotSync, launchGodotEditor, runGodotProject } from '../../src/godot/headless.js'

// execFileAsyncMock is hoisted so it is available inside the vi.mock factory.
// We attach it as [promisify.custom] on execFile so that promisify(execFile)
// returns { stdout, stderr } correctly (matching Node.js built-in behaviour).
const { execFileAsyncMock } = vi.hoisted(() => ({
  execFileAsyncMock:
    vi.fn<(cmd: string, args: string[], opts: unknown) => Promise<{ stdout: string; stderr: string }>>(),
}))

vi.mock('node:child_process', async () => {
  const { promisify: _promisify } = await import('node:util')
  const execFileMock = vi.fn()
  // @ts-expect-error - attaching custom promisify
  execFileMock[_promisify.custom] = execFileAsyncMock
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
    it('should execute Godot with correct arguments and default timeout', () => {
      vi.mocked(child_process.spawnSync).mockReturnValue({
        stdout: 'output',
        stderr: '',
        status: 0,
        output: [],
        pid: 0,
        signal: null,
      })
      const result = execGodotSync('/usr/bin/godot', ['--version'])
      expect(result.success).toBe(true)
      expect(result.stdout).toBe('output')
      expect(child_process.spawnSync).toHaveBeenCalledWith(
        '/usr/bin/godot',
        ['--version'],
        expect.objectContaining({
          timeout: 30_000,
          encoding: 'utf-8',
          stdio: ['pipe', 'pipe', 'pipe'],
        }),
      )
    })

    it('should handle success with missing stdout', () => {
      vi.mocked(child_process.spawnSync).mockReturnValue({
        stdout: null as unknown as string,
        stderr: '',
        status: 0,
        output: [],
        pid: 0,
        signal: null,
      })
      const result = execGodotSync('/usr/bin/godot', ['--version'])
      expect(result.success).toBe(true)
      expect(result.stdout).toBe('')
    })

    it('should pass custom timeout and cwd', () => {
      vi.mocked(child_process.spawnSync).mockReturnValue({
        stdout: 'output',
        stderr: '',
        status: 0,
        output: [],
        pid: 0,
        signal: null,
      })
      execGodotSync('/usr/bin/godot', ['--version'], { timeout: 1000, cwd: '/tmp' })
      expect(child_process.spawnSync).toHaveBeenCalledWith(
        '/usr/bin/godot',
        ['--version'],
        expect.objectContaining({ timeout: 1000, cwd: '/tmp' }),
      )
    })

    it('should handle execution errors with status', () => {
      vi.mocked(child_process.spawnSync).mockReturnValue({
        stdout: '',
        stderr: 'Error message',
        status: 1,
        output: [],
        pid: 0,
        signal: null,
      })
      const result = execGodotSync('/usr/bin/godot', ['--invalid'])
      expect(result.success).toBe(false)
      expect(result.stderr).toBe('Error message')
      expect(result.exitCode).toBe(1)
    })

    it('should handle execution errors with result.error (fallback to 1)', () => {
      vi.mocked(child_process.spawnSync).mockReturnValue({
        error: new Error('Failed to start'),
        stdout: '',
        stderr: '',
        status: null,
        output: [],
        pid: 0,
        signal: null,
      })
      const result = execGodotSync('/usr/bin/godot', ['--version'])
      expect(result.success).toBe(false)
      expect(result.stderr).toBe('Failed to start')
      expect(result.exitCode).toBe(1)
    })

    it('should handle execution errors with empty stderr (fallback to Unknown error)', () => {
      vi.mocked(child_process.spawnSync).mockReturnValue({
        stdout: '',
        stderr: '',
        status: 1,
        output: [],
        pid: 0,
        signal: null,
      })
      const result = execGodotSync('/usr/bin/godot', ['--version'])
      expect(result.success).toBe(false)
      expect(result.stderr).toBe('Unknown error')
      expect(result.exitCode).toBe(1)
    })

    it('should handle execution errors with empty stderr and result.error.message', () => {
      vi.mocked(child_process.spawnSync).mockReturnValue({
        error: new Error('Specific error'),
        stdout: '',
        stderr: '',
        status: 2,
        output: [],
        pid: 0,
        signal: null,
      })
      const result = execGodotSync('/usr/bin/godot', ['--version'])
      expect(result.success).toBe(false)
      expect(result.stderr).toBe('Specific error')
      expect(result.exitCode).toBe(2)
    })

    it('should prevent command injection by using spawnSync with array args', () => {
      const maliciousArgs = [';', 'ls', '-la']
      vi.mocked(child_process.spawnSync).mockReturnValue({
        stdout: 'success',
        stderr: '',
        status: 0,
        output: [],
        pid: 0,
        signal: null,
      })

      execGodotSync('/usr/bin/godot', maliciousArgs)

      expect(child_process.spawnSync).toHaveBeenCalledWith('/usr/bin/godot', maliciousArgs, expect.any(Object))
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

    it('should use default timeout of 30_000 and pass custom options', async () => {
      execFileAsyncMock.mockResolvedValue({ stdout: '', stderr: '' })

      await execGodotAsync('/usr/bin/godot', ['--version'], { timeout: 5000, cwd: '/tmp' })
      expect(execFileAsyncMock).toHaveBeenCalledWith(
        '/usr/bin/godot',
        ['--version'],
        expect.objectContaining({ timeout: 5000, cwd: '/tmp' }),
      )
    })

    it('should handle failure with code, stdout, and stderr', async () => {
      const error = Object.assign(new Error('fail'), { stdout: '  out  ', stderr: '  err  ', code: 2 })
      execFileAsyncMock.mockRejectedValue(error)

      const result = await execGodotAsync('/usr/bin/godot', ['--version'])
      expect(result.success).toBe(false)
      expect(result.stdout).toBe('out')
      expect(result.stderr).toBe('err')
      expect(result.exitCode).toBe(2)
    })

    it('should fall back to error.message and exitCode 1', async () => {
      execFileAsyncMock.mockRejectedValue(new Error('command not found'))

      const result = await execGodotAsync('/usr/bin/godot', ['--version'])
      expect(result.success).toBe(false)
      expect(result.stderr).toBe('command not found')
      expect(result.exitCode).toBe(1)
    })

    it('should handle error with empty stderr and stdout', async () => {
      const error = Object.assign(new Error(''), { stdout: '', stderr: '', code: 3 })
      execFileAsyncMock.mockRejectedValue(error)

      const result = await execGodotAsync('/usr/bin/godot', ['--version'])
      expect(result.success).toBe(false)
      expect(result.stdout).toBe('')
      expect(result.stderr).toBe('Unknown error')
      expect(result.exitCode).toBe(3)
    })
  })

  // ==========================================
  // runGodotProject
  // ==========================================
  describe('runGodotProject', () => {
    it('should spawn Godot with correct arguments and call unref', () => {
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
