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

vi.mock('node:child_process', async (importActual) => {
  const actual = await importActual<typeof import('node:child_process')>()
  const { promisify: _promisify } = await import('node:util')
  const execFileMock = vi.fn()
  // @ts-expect-error - attaching custom promisify implementation
  execFileMock[_promisify.custom] = execFileAsyncMock
  return {
    ...actual,
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
    it('executes Godot with correct arguments using spawnSync (secure version)', () => {
      const godotPath = '/usr/bin/godot'
      const args = ['--version']
      const options = { timeout: 1000, cwd: '/tmp' }

      // Mock successful execution
      vi.mocked(child_process.spawnSync).mockReturnValue({
        stdout: '4.2.1',
        stderr: '',
        status: 0,
        output: [],
        pid: 0,
        signal: null,
      })

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
      })
      const result = execGodotSync('/usr/bin/godot', ['--version'])
      expect(result.success).toBe(true)
      expect(child_process.spawnSync).toHaveBeenCalledWith(
        '/usr/bin/godot',
        ['--version'],
        expect.objectContaining({ timeout: 30_000 }),
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
        status: (error as unknown as { status: number }).status ?? 1,
        stdout: (error as unknown as { stdout: string }).stdout ?? '',
        stderr: (error as unknown as { stderr: string }).stderr ?? '',
        output: [],
        pid: 0,
        signal: null,
      })

      const result = execGodotSync(godotPath, args)

      expect(result.success).toBe(false)
      expect(result.stderr).toBe('Unknown argument')
      expect(result.exitCode).toBe(1)
    })

    it('should handle error without status (fallback to 1)', () => {
      const error = new Error('Timeout') as Error & { status?: number; stdout?: string; stderr?: string }
      vi.mocked(child_process.spawnSync).mockReturnValue({
        error,
        status: undefined as unknown as number,
        stdout: error.stdout ?? '',
        stderr: error.stderr ?? '',
        output: [],
        pid: 0,
        signal: null,
      })
      const result = execGodotSync('/usr/bin/godot', ['--version'])
      expect(result.success).toBe(false)
      expect(result.exitCode).toBe(1)
      expect(result.stderr).toBe('Timeout')
    })

    it('should handle error with empty stdout/stderr and no error message', () => {
      const error = { status: 2, stdout: '', stderr: '' }
      vi.mocked(child_process.spawnSync).mockReturnValue({
        error: error as unknown as Error,
        status: error.status,
        stdout: error.stdout,
        stderr: error.stderr,
        output: [],
        pid: 0,
        signal: null,
      })
      const result = execGodotSync('/usr/bin/godot', ['--version'])
      expect(result.success).toBe(false)
      expect(result.stderr).toBe('Unknown error')
      expect(result.exitCode).toBe(2)
    })

    it('should handle success with empty stdout', () => {
      vi.mocked(child_process.spawnSync).mockReturnValue({
        stdout: undefined as unknown as string,
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

    it('should use spawnSync to prevent command injection', () => {
      const godotPath = '/usr/bin/godot'
      const args = ['--headless', '--script', 'test.gd']

      vi.mocked(child_process.spawnSync).mockReturnValue({
        stdout: 'success',
        stderr: '',
        status: 0,
        output: [],
        pid: 0,
        signal: null,
      })

      const result = execGodotSync(godotPath, args)

      expect(result.success).toBe(true)
      expect(result.stdout).toBe('success')

      // Verify spawnSync is called, not spawn
      expect(child_process.spawnSync).toHaveBeenCalledTimes(1)
      expect(child_process.spawn).not.toHaveBeenCalled()

      // Verify arguments are passed as array to spawnSync, which prevents command injection
      expect(child_process.spawnSync).toHaveBeenCalledWith(godotPath, args, expect.any(Object))
    })

    it('should safely handle malicious arguments without executing them as shell commands', () => {
      const godotPath = '/usr/bin/godot'
      const maliciousArgs = ['--headless', '--script', 'test.gd', ';', 'ls', '-la']

      vi.mocked(child_process.spawnSync).mockReturnValue({
        stdout: 'success',
        stderr: '',
        status: 0,
        output: [],
        pid: 0,
        signal: null,
      })

      execGodotSync(godotPath, maliciousArgs)

      expect(child_process.spawnSync).toHaveBeenCalledWith(
        godotPath,
        ['--headless', '--script', 'test.gd', ';', 'ls', '-la'],
        expect.any(Object),
      )
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

    it('should pass custom timeout through to execFile', async () => {
      execFileAsyncMock.mockResolvedValue({ stdout: '', stderr: '' })

      await execGodotAsync('/usr/bin/godot', ['--version'], { timeout: 5000 })
      expect(execFileAsyncMock).toHaveBeenCalledWith(
        '/usr/bin/godot',
        ['--version'],
        expect.objectContaining({ timeout: 5000 }),
      )
    })

    it('should pass custom cwd through to execFile', async () => {
      execFileAsyncMock.mockResolvedValue({ stdout: '', stderr: '' })

      await execGodotAsync('/usr/bin/godot', ['--version'], { cwd: '/tmp/project' })
      expect(execFileAsyncMock).toHaveBeenCalledWith(
        '/usr/bin/godot',
        ['--version'],
        expect.objectContaining({ cwd: '/tmp/project' }),
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
      expect(result.stdout).toBe('')
      expect(result.stderr).toBe('command not found')
      expect(result.exitCode).toBe(1)
    })

    it('should fall back to "Unknown error" when error is empty', async () => {
      execFileAsyncMock.mockRejectedValue({})

      const result = await execGodotAsync('/usr/bin/godot', ['--version'])
      expect(result.success).toBe(false)
      expect(result.stderr).toBe('Unknown error')
      expect(result.exitCode).toBe(1)
    })

    it('should return empty strings when success stdout and stderr are empty', async () => {
      execFileAsyncMock.mockResolvedValue({
        stdout: undefined as unknown as string,
        stderr: null as unknown as string,
      })

      const result = await execGodotAsync('/usr/bin/godot', ['--version'])
      expect(result.success).toBe(true)
      expect(result.stdout).toBe('')
      expect(result.stderr).toBe('')
      expect(result.exitCode).toBe(0)
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
})
