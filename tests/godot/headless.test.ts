/**
 * Tests for headless.ts
 */

import * as child_process from 'node:child_process'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  execGodotAsync,
  execGodotScript,
  execGodotSync,
  launchGodotEditor,
  runGodotProject,
} from '../../src/godot/headless.js'

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
    it('should use default timeout when not specified', () => {
      vi.mocked(child_process.spawnSync).mockReturnValue({ stdout: 'output', stderr: '', status: 0 })
      const result = execGodotSync('/usr/bin/godot', ['--version'])
      expect(result.success).toBe(true)
      expect(child_process.spawnSync).toHaveBeenCalledWith(
        '/usr/bin/godot',
        ['--version'],
        expect.objectContaining({ timeout: 30_000 }),
      )
    })

    it('should use provided timeout and cwd', () => {
      vi.mocked(child_process.spawnSync).mockReturnValue({ stdout: 'output', stderr: '', status: 0 })
      const result = execGodotSync('/usr/bin/godot', ['--version'], { timeout: 1000, cwd: '/tmp' })
      expect(result.success).toBe(true)
      expect(child_process.spawnSync).toHaveBeenCalledWith(
        '/usr/bin/godot',
        ['--version'],
        expect.objectContaining({ timeout: 1000, cwd: '/tmp' }),
      )
    })

    it('should handle execution errors', () => {
      const error = new Error('Command failed')
      vi.mocked(child_process.spawnSync).mockReturnValue({
        error,
        status: 1,
        stdout: '',
        stderr: 'Unknown argument',
      })

      const result = execGodotSync('/usr/bin/godot', ['--invalid'])

      expect(result.success).toBe(false)
      expect(result.stderr).toBe('Unknown argument')
      expect(result.exitCode).toBe(1)
    })

    it('should handle error without status (fallback to 1)', () => {
      const error = new Error('Timeout')
      vi.mocked(child_process.spawnSync).mockReturnValue({
        error,
        status: null as unknown as number,
        stdout: '',
        stderr: '',
      })
      const result = execGodotSync('/usr/bin/godot', ['--version'])
      expect(result.success).toBe(false)
      expect(result.exitCode).toBe(1)
      expect(result.stderr).toBe('Timeout')
    })

    it('should use result.stderr when both stderr and error.message exist', () => {
      const error = new Error('Original Error')
      vi.mocked(child_process.spawnSync).mockReturnValue({
        error,
        status: 1,
        stdout: '',
        stderr: 'Custom Stderr',
      })
      const result = execGodotSync('/usr/bin/godot', ['--version'])
      expect(result.stderr).toBe('Custom Stderr')
    })

    it('should use error.message when stderr is missing or empty in execGodotSync', () => {
      const error = new Error('Original Error')
      vi.mocked(child_process.spawnSync).mockReturnValue({
        error,
        status: 1,
        stdout: '',
        stderr: '',
      })
      const result = execGodotSync('/usr/bin/godot', ['--version'])
      expect(result.stderr).toBe('Original Error')

      vi.mocked(child_process.spawnSync).mockReturnValue({
        error,
        status: 1,
        stdout: '',
        stderr: null as unknown as string,
      })
      const result2 = execGodotSync('/usr/bin/godot', ['--version'])
      expect(result2.stderr).toBe('Original Error')
    })

    it('should use Unknown error when everything is missing in execGodotSync', () => {
      vi.mocked(child_process.spawnSync).mockReturnValue({
        error: {} as Error,
        status: 1,
        stdout: '',
        stderr: '',
      })
      const result = execGodotSync('/usr/bin/godot', ['--version'])
      expect(result.stderr).toBe('Unknown error')
    })

    it('should handle error with empty stdout/stderr', () => {
      const error = new Error('fail')
      vi.mocked(child_process.spawnSync).mockReturnValue({
        error,
        status: 2,
        stdout: '',
        stderr: '',
      })
      const result = execGodotSync('/usr/bin/godot', ['--version'])
      expect(result.success).toBe(false)
      expect(result.stdout).toBe('')
      expect(result.stderr).toBe('fail')
      expect(result.exitCode).toBe(2)
    })

    it('should return empty strings when success stdout and stderr are missing', () => {
      vi.mocked(child_process.spawnSync).mockReturnValue({
        stdout: null as unknown as string,
        stderr: null as unknown as string,
        status: 0,
      })
      const result = execGodotSync('/usr/bin/godot', ['--version'])
      expect(result.success).toBe(true)
      expect(result.stdout).toBe('')
      expect(result.stderr).toBe('')
    })
  })

  // ==========================================
  // execGodotScript
  // ==========================================
  describe('execGodotScript', () => {
    it('should construct correct args for headless script execution', () => {
      vi.mocked(child_process.spawnSync).mockReturnValue({ stdout: 'script output', stderr: '', status: 0 })
      const result = execGodotScript('/usr/bin/godot', '/tmp/script.gd', '/tmp/project')
      expect(result.success).toBe(true)
      expect(result.stdout).toBe('script output')
      expect(child_process.spawnSync).toHaveBeenCalledWith(
        '/usr/bin/godot',
        ['--headless', '--path', '/tmp/project', '--script', '/tmp/script.gd'],
        expect.anything(),
      )
    })

    it('should append extra args after -- separator', () => {
      vi.mocked(child_process.spawnSync).mockReturnValue({ stdout: 'result', stderr: '', status: 0 })
      execGodotScript('/usr/bin/godot', '/tmp/script.gd', '/tmp/project', ['--arg1', '--arg2'])
      expect(child_process.spawnSync).toHaveBeenCalledWith(
        '/usr/bin/godot',
        ['--headless', '--path', '/tmp/project', '--script', '/tmp/script.gd', '--', '--arg1', '--arg2'],
        expect.anything(),
      )
    })

    it('should pass timeout option', () => {
      vi.mocked(child_process.spawnSync).mockReturnValue({ stdout: 'result', stderr: '', status: 0 })
      execGodotScript('/usr/bin/godot', '/tmp/script.gd', '/tmp/project', undefined, { timeout: 5000 })
      expect(child_process.spawnSync).toHaveBeenCalledWith(
        '/usr/bin/godot',
        ['--headless', '--path', '/tmp/project', '--script', '/tmp/script.gd'],
        expect.objectContaining({ timeout: 5000 }),
      )
    })
  })

  // ==========================================
  // runGodotProject
  // ==========================================
  describe('runGodotProject', () => {
    it('should spawn Godot with correct arguments', () => {
      const mockChild = { unref: vi.fn(), pid: 42 }
      vi.mocked(child_process.spawn).mockReturnValue(mockChild as unknown as child_process.ChildProcess)

      const result = runGodotProject('/usr/bin/godot', '/tmp/project')
      expect(result.pid).toBe(42)
      expect(child_process.spawn).toHaveBeenCalledWith('/usr/bin/godot', ['--path', '/tmp/project'], {
        detached: true,
        stdio: 'ignore',
      })
      expect(mockChild.unref).toHaveBeenCalled()
    })

    it('should return undefined pid when spawn fails to assign pid', () => {
      const mockChild = { unref: vi.fn(), pid: undefined }
      vi.mocked(child_process.spawn).mockReturnValue(mockChild as unknown as child_process.ChildProcess)

      const result = runGodotProject('/usr/bin/godot', '/tmp/project')
      expect(result.pid).toBeUndefined()
    })
  })

  // ==========================================
  // launchGodotEditor
  // ==========================================
  describe('launchGodotEditor', () => {
    it('should spawn Godot editor with --editor flag', () => {
      const mockChild = { unref: vi.fn(), pid: 99 }
      vi.mocked(child_process.spawn).mockReturnValue(mockChild as unknown as child_process.ChildProcess)

      const result = launchGodotEditor('/usr/bin/godot', '/tmp/project')
      expect(result.pid).toBe(99)
      expect(child_process.spawn).toHaveBeenCalledWith('/usr/bin/godot', ['--editor', '--path', '/tmp/project'], {
        detached: true,
        stdio: 'ignore',
      })
      expect(mockChild.unref).toHaveBeenCalled()
    })

    it('should return undefined pid when editor spawn fails', () => {
      const mockChild = { unref: vi.fn(), pid: undefined }
      vi.mocked(child_process.spawn).mockReturnValue(mockChild as unknown as child_process.ChildProcess)

      const result = launchGodotEditor('/usr/bin/godot', '/tmp/project')
      expect(result.pid).toBeUndefined()
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
      expect(result.stdout).toBe('')
      expect(result.stderr).toBe('command not found')
      expect(result.exitCode).toBe(1)
    })

    it('should return empty strings when success stdout and stderr are missing', async () => {
      execFileAsyncMock.mockResolvedValue({ stdout: null as unknown as string, stderr: null as unknown as string })

      const result = await execGodotAsync('/usr/bin/godot', ['--version'])
      expect(result.success).toBe(true)
      expect(result.stdout).toBe('')
      expect(result.stderr).toBe('')
      expect(result.exitCode).toBe(0)
    })

    it('should use provided timeout and cwd', async () => {
      execFileAsyncMock.mockResolvedValue({ stdout: 'output', stderr: '' })

      const result = await execGodotAsync('/usr/bin/godot', ['--version'], { timeout: 1000, cwd: '/tmp' })
      expect(result.success).toBe(true)
      expect(execFileAsyncMock).toHaveBeenCalledWith(
        '/usr/bin/godot',
        ['--version'],
        expect.objectContaining({ timeout: 1000, cwd: '/tmp' }),
      )
    })

    it('should handle failure with missing stdout and stderr in error', async () => {
      const error = Object.assign(new Error('fail'), {
        stdout: null as unknown as string,
        stderr: null as unknown as string,
        code: null as unknown as number,
      })
      execFileAsyncMock.mockRejectedValue(error)

      const result = await execGodotAsync('/usr/bin/godot', ['--version'])
      expect(result.success).toBe(false)
      expect(result.stdout).toBe('')
      expect(result.stderr).toBe('fail')
      expect(result.exitCode).toBe(1)
    })

    it('should use error.stderr when both stderr and error.message exist in catch block', async () => {
      const error = Object.assign(new Error('Original Error'), { stdout: '', stderr: 'Custom Stderr', code: 1 })
      execFileAsyncMock.mockRejectedValue(error)
      const result = await execGodotAsync('/usr/bin/godot', ['--version'])
      expect(result.stderr).toBe('Custom Stderr')
    })

    it('should use error.message when stderr is missing or empty in execGodotAsync catch block', async () => {
      const error = Object.assign(new Error('Original Error'), { stdout: '', stderr: '', code: 1 })
      execFileAsyncMock.mockRejectedValue(error)
      const result = await execGodotAsync('/usr/bin/godot', ['--version'])
      expect(result.stderr).toBe('Original Error')

      const error2 = Object.assign(new Error('Original Error'), {
        stdout: '',
        stderr: null as unknown as string,
        code: 1,
      })
      execFileAsyncMock.mockRejectedValue(error2)
      const result2 = await execGodotAsync('/usr/bin/godot', ['--version'])
      expect(result2.stderr).toBe('Original Error')
    })

    it('should use Unknown error when everything is missing in execGodotAsync catch block', async () => {
      execFileAsyncMock.mockRejectedValue({} as Error)
      const result = await execGodotAsync('/usr/bin/godot', ['--version'])
      expect(result.stderr).toBe('Unknown error')
    })
  })

  // ==========================================
  // Security
  // ==========================================
  describe('Security', () => {
    it('should use spawnSync instead of spawnSync to prevent command injection', () => {
      const godotPath = '/usr/bin/godot'
      const args = ['--headless', '--script', 'test.gd']

      vi.mocked(child_process.spawnSync).mockReturnValue({ stdout: 'success', stderr: '', status: 0 })

      const result = execGodotSync(godotPath, args)

      expect(result.success).toBe(true)
      expect(child_process.spawnSync).toHaveBeenCalledTimes(1)
      expect(child_process.spawn).not.toHaveBeenCalled()
      expect(child_process.spawnSync).toHaveBeenCalledWith(godotPath, args, expect.any(Object))
    })

    it('should safely handle malicious arguments without executing them as shell commands', () => {
      const godotPath = '/usr/bin/godot'
      const maliciousArgs = ['--headless', '--script', 'test.gd', ';', 'ls', '-la']

      vi.mocked(child_process.spawnSync).mockReturnValue({ stdout: 'success', stderr: '', status: 0 })

      execGodotSync(godotPath, maliciousArgs)

      expect(child_process.spawnSync).toHaveBeenCalledWith(
        godotPath,
        ['--headless', '--script', 'test.gd', ';', 'ls', '-la'],
        expect.any(Object),
      )
    })
  })
})
