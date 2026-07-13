/**
 * Tests for headless.ts - execGodotSync, execGodotAsync, runGodotProject, launchGodotEditor
 */

import * as child_process from 'node:child_process'
import { EventEmitter } from 'node:events'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  clearProjectLogs,
  execGodotAsync,
  execGodotSync,
  getProjectLogs,
  getTrackedPids,
  killProcessTree,
  launchGodotEditor,
  runGodotProject,
  spawnCaptured,
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
    execFileSync: vi.fn(),
  }
})

interface ExecError extends Error {
  status?: number
  stdout?: string
  stderr?: string
  code?: number
}

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
        stdout: 'Godot Engine v4.0.stable.official',
        stderr: '',
        status: 0,
        output: [],
        pid: 0,
        signal: null,
      } as unknown as child_process.SpawnSyncReturns<string>)

      const result = execGodotSync(godotPath, args, options)

      expect(result.success).toBe(true)
      expect(result.stdout).toBe('Godot Engine v4.0.stable.official')
      expect(result.exitCode).toBe(0)
      expect(child_process.spawnSync).toHaveBeenCalledWith(godotPath, args, {
        timeout: 1000,
        cwd: '/tmp',
        stdio: ['pipe', 'pipe', 'pipe'],
        encoding: 'utf-8',
      })
    })

    it('returns failure on non-zero exit code', () => {
      vi.mocked(child_process.spawnSync).mockReturnValue({
        stdout: '',
        stderr: 'Error: Something went wrong',
        status: 1,
        output: [],
        pid: 0,
        signal: null,
      } as unknown as child_process.SpawnSyncReturns<string>)

      const result = execGodotSync('/usr/bin/godot', ['--invalid'])
      expect(result.success).toBe(false)
      expect(result.stderr).toBe('Error: Something went wrong')
      expect(result.exitCode).toBe(1)
    })

    it('returns failure on spawnSync error', () => {
      vi.mocked(child_process.spawnSync).mockReturnValue({
        error: new Error('Command not found'),
        status: null,
        stdout: '',
        stderr: '',
        output: [],
        pid: 0,
        signal: null,
      } as unknown as child_process.SpawnSyncReturns<string>)

      const result = execGodotSync('/usr/bin/godot', ['--version'])
      expect(result.success).toBe(false)
      expect(result.stderr).toBe('Command not found')
      expect(result.exitCode).toBe(1)
    })

    it('uses default timeout if not provided', () => {
      vi.mocked(child_process.spawnSync).mockReturnValue({
        stdout: '',
        stderr: '',
        status: 0,
        output: [],
        pid: 0,
        signal: null,
      } as unknown as child_process.SpawnSyncReturns<string>)

      execGodotSync('/usr/bin/godot', ['--version'])
      expect(child_process.spawnSync).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(Array),
        expect.objectContaining({ timeout: 30000 }),
      )
    })

    it('should handle timeout error in spawnSync', () => {
      vi.mocked(child_process.spawnSync).mockReturnValue({
        error: new Error('Timeout'),
        status: null,
        stdout: '',
        stderr: '',
        output: [],
        pid: 0,
        signal: null,
      } as unknown as child_process.SpawnSyncReturns<string>)
      const result = execGodotSync('/usr/bin/godot', ['--version'])
      expect(result.success).toBe(false)
      expect(result.exitCode).toBe(1)
      expect(result.stderr).toBe('Timeout')
    })

    it('should handle error without stderr or error message', () => {
      vi.mocked(child_process.spawnSync).mockReturnValue({
        error: {} as Error,
        status: 2,
        stdout: null as unknown as string,
        stderr: null as unknown as string,
        output: [],
        pid: 0,
        signal: null,
      } as unknown as child_process.SpawnSyncReturns<string>)
      const result = execGodotSync('/usr/bin/godot', ['--version'])
      expect(result.success).toBe(false)
      expect(result.stderr).toBe('Unknown error')
      expect(result.exitCode).toBe(2)
    })

    it('should handle success with null stdout/stderr', () => {
      vi.mocked(child_process.spawnSync).mockReturnValue({
        stdout: null as unknown as string,
        stderr: null as unknown as string,
        status: 0,
        output: [],
        pid: 0,
        signal: null,
      } as unknown as child_process.SpawnSyncReturns<string>)
      const result = execGodotSync('/usr/bin/godot', ['--version'])
      expect(result.success).toBe(true)
      expect(result.stdout).toBe('')
      expect(result.stderr).toBe('')
    })

    it('should handle error with empty stdout/stderr', () => {
      const error = new Error('fail') as ExecError
      error.status = 2
      error.stdout = ''
      error.stderr = ''
      vi.mocked(child_process.spawnSync).mockReturnValue({
        error,
        status: error.status,
        stdout: error.stdout,
        stderr: error.stderr,
        output: [],
        pid: 0,
        signal: null,
      } as unknown as child_process.SpawnSyncReturns<string>)
      const result = execGodotSync('/usr/bin/godot', ['--version'])
      expect(result.success).toBe(false)
      expect(result.stdout).toBe('')
      expect(result.stderr).toBe('fail')
      expect(result.exitCode).toBe(2)
    })

    it('should use spawnSync instead of spawn to prevent command injection', () => {
      const godotPath = '/usr/bin/godot'
      const args = ['--headless', '--script', 'test.gd']

      vi.mocked(child_process.spawnSync).mockReturnValue({
        stdout: 'success',
        stderr: '',
        status: 0,
        output: [],
        pid: 0,
        signal: null,
      } as unknown as child_process.SpawnSyncReturns<string>)

      execGodotSync(godotPath, args)

      expect(child_process.spawnSync).toHaveBeenCalledWith(godotPath, args, expect.any(Object))
    })

    it('should safely handle malicious arguments without executing them as shell commands', () => {
      const godotPath = '/usr/bin/godot'
      const args = ['--version; rm -rf /']

      vi.mocked(child_process.spawnSync).mockReturnValue({
        stdout: 'version output',
        stderr: '',
        status: 0,
        output: [],
        pid: 0,
        signal: null,
      } as unknown as child_process.SpawnSyncReturns<string>)

      const result = execGodotSync(godotPath, args)
      expect(result.success).toBe(true)
      expect(child_process.spawnSync).toHaveBeenCalledWith(godotPath, args, expect.any(Object))
    })

    it('should handle non-string stdout/stderr in error result', () => {
      vi.mocked(child_process.spawnSync).mockReturnValue({
        stdout: 123 as unknown as string,
        stderr: { some: 'obj' } as unknown as string,
        status: 1,
        output: [],
        pid: 0,
        signal: null,
      } as unknown as child_process.SpawnSyncReturns<string>)

      const result = execGodotSync('/usr/bin/godot', ['--version'])
      expect(result.success).toBe(false)
      expect(result.stdout).toBe('')
      expect(result.stderr).toBe('Unknown error')
    })

    it('should handle non-string error message in error result', () => {
      vi.mocked(child_process.spawnSync).mockReturnValue({
        error: { message: 123 } as unknown as Error,
        status: 1,
        stdout: '',
        stderr: '',
        output: [],
        pid: 0,
        signal: null,
      } as unknown as child_process.SpawnSyncReturns<string>)

      const result = execGodotSync('/usr/bin/godot', ['--version'])
      expect(result.success).toBe(false)
      expect(result.stderr).toBe('Unknown error')
    })

    it('should handle non-number status in error result', () => {
      vi.mocked(child_process.spawnSync).mockReturnValue({
        status: 'fail' as unknown as number,
        stdout: '',
        stderr: 'failed',
        output: [],
        pid: 0,
        signal: null,
      } as unknown as child_process.SpawnSyncReturns<string>)

      const result = execGodotSync('/usr/bin/godot', ['--version'])
      expect(result.success).toBe(false)
      expect(result.exitCode).toBe(1)
    })
  })

  // ==========================================
  // runGodotProject
  // ==========================================
  describe('runGodotProject', () => {
    it('should spawn Godot with correct arguments', () => {
      const mockChild = { unref: vi.fn(), once: vi.fn(), pid: 42 }
      vi.mocked(child_process.spawn).mockReturnValue(mockChild as never)

      const result = runGodotProject('/usr/bin/godot', '/tmp/project')
      expect(result.pid).toBe(42)
      expect(child_process.spawn).toHaveBeenCalledWith('/usr/bin/godot', ['--path', '/tmp/project'], {
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      expect(mockChild.unref).toHaveBeenCalled()
    })

    it('should include scenePath in arguments when provided', () => {
      const mockChild = { unref: vi.fn(), once: vi.fn(), pid: 43 }
      vi.mocked(child_process.spawn).mockReturnValue(mockChild as never)

      const result = runGodotProject('/usr/bin/godot', '/tmp/project', 'res://main.tscn')
      expect(result.pid).toBe(43)
      expect(child_process.spawn).toHaveBeenCalledWith(
        '/usr/bin/godot',
        ['--path', '/tmp/project', 'res://main.tscn'],
        {
          detached: true,
          stdio: ['ignore', 'pipe', 'pipe'],
        },
      )
    })

    it('should return undefined pid when spawn fails to assign pid', () => {
      const mockChild = { unref: vi.fn(), pid: undefined }
      vi.mocked(child_process.spawn).mockReturnValue(mockChild as never)

      const result = runGodotProject('/usr/bin/godot', '/tmp/project')
      expect(result.pid).toBeUndefined()
    })

    it('should throw if spawn throws synchronously', () => {
      vi.mocked(child_process.spawn).mockImplementationOnce(() => {
        throw new Error('Spawn failed')
      })

      expect(() => runGodotProject('/usr/bin/godot', '/tmp/project')).toThrow('Spawn failed')
    })
  })

  // ==========================================
  // spawnCaptured / project logs ring buffer
  // ==========================================
  describe('spawnCaptured', () => {
    function mockChildWithStreams(pid: number | undefined) {
      const stdout = Object.assign(new EventEmitter(), { unref: vi.fn() })
      const stderr = Object.assign(new EventEmitter(), { unref: vi.fn() })
      const child = Object.assign(new EventEmitter(), { unref: vi.fn(), pid, stdout, stderr })
      vi.mocked(child_process.spawn).mockReturnValue(child as never)
      return { child, stdout, stderr }
    }

    it('spawns with piped stdio (not ignore) so output can be captured', () => {
      const { child } = mockChildWithStreams(100)

      spawnCaptured('/usr/bin/godot', ['--path', '/tmp/project'])

      expect(child_process.spawn).toHaveBeenCalledWith('/usr/bin/godot', ['--path', '/tmp/project'], {
        detached: true,
        stdio: ['ignore', 'pipe', 'pipe'],
      })
      expect(child.unref).toHaveBeenCalled()
    })

    it('captures stdout and stderr chunks into the per-pid ring buffer', () => {
      const { stdout, stderr } = mockChildWithStreams(101)

      spawnCaptured('/usr/bin/godot', ['--path', '/tmp/project'])
      stdout.emit('data', Buffer.from('line1\n'))
      stderr.emit('data', Buffer.from('line2\n'))
      stdout.emit('data', Buffer.from('line3'))

      const logs = getProjectLogs(101)
      expect(logs?.lines).toEqual(['line1', 'line2', 'line3'])
      expect(logs?.truncated).toBe(false)
    })

    it('unrefs the stdout/stderr streams so a live child does not block process exit', () => {
      const { stdout, stderr } = mockChildWithStreams(102)

      spawnCaptured('/usr/bin/godot', ['--path', '/tmp/project'])

      expect(stdout.unref).toHaveBeenCalled()
      expect(stderr.unref).toHaveBeenCalled()
    })

    it('drops empty lines produced by trailing newlines', () => {
      const { stdout } = mockChildWithStreams(103)

      spawnCaptured('/usr/bin/godot', ['--path', '/tmp/project'])
      stdout.emit('data', Buffer.from('only\n\n'))

      expect(getProjectLogs(103)?.lines).toEqual(['only'])
    })

    it('keeps only the last 400 lines and marks the buffer truncated', () => {
      const { stdout } = mockChildWithStreams(104)

      spawnCaptured('/usr/bin/godot', ['--path', '/tmp/project'])
      for (let i = 0; i < 410; i++) {
        stdout.emit('data', Buffer.from(`line${i}\n`))
      }

      const logs = getProjectLogs(104)
      expect(logs?.lines).toHaveLength(400)
      expect(logs?.lines[0]).toBe('line10')
      expect(logs?.lines[399]).toBe('line409')
      expect(logs?.truncated).toBe(true)
    })

    it('does not report truncated when exactly 400 lines were captured (no lines actually dropped)', () => {
      const { stdout } = mockChildWithStreams(150)

      spawnCaptured('/usr/bin/godot', ['--path', '/tmp/project'])
      for (let i = 0; i < 400; i++) {
        stdout.emit('data', Buffer.from(`line${i}\n`))
      }

      const logs = getProjectLogs(150)
      expect(logs?.lines).toHaveLength(400)
      expect(logs?.truncated).toBe(false)

      clearProjectLogs(150)
    })

    it('does not register a ring buffer entry when spawn fails to assign a pid', () => {
      mockChildWithStreams(undefined)

      const result = spawnCaptured('/usr/bin/godot', ['--path', '/tmp/project'])

      expect(result.pid).toBeUndefined()
    })

    it('getProjectLogs returns undefined for an unknown pid', () => {
      expect(getProjectLogs(999999)).toBeUndefined()
    })

    it('clearProjectLogs removes the ring buffer entry for a pid', () => {
      mockChildWithStreams(105)
      spawnCaptured('/usr/bin/godot', ['--path', '/tmp/project'])
      expect(getProjectLogs(105)).toBeDefined()

      clearProjectLogs(105)

      expect(getProjectLogs(105)).toBeUndefined()
    })

    it('runGodotProject output flows through the same ring buffer as spawnCaptured', () => {
      const { stdout } = mockChildWithStreams(106)

      runGodotProject('/usr/bin/godot', '/tmp/project')
      stdout.emit('data', Buffer.from('hello from game\n'))

      expect(getProjectLogs(106)?.lines).toEqual(['hello from game'])
    })

    it('getTrackedPids reflects currently-live spawned pids', () => {
      mockChildWithStreams(201)
      spawnCaptured('/usr/bin/godot', ['--path', '/tmp/project'])
      mockChildWithStreams(202)
      spawnCaptured('/usr/bin/godot', ['--path', '/tmp/project'])

      const tracked = getTrackedPids()
      expect(tracked).toContain(201)
      expect(tracked).toContain(202)

      clearProjectLogs(201)
      clearProjectLogs(202)
    })

    it('removes an exited pid from getTrackedPids, but keeps its logs available for post-crash debugging', () => {
      const { child, stdout } = mockChildWithStreams(301)
      spawnCaptured('/usr/bin/godot', ['--path', '/tmp/project'])
      stdout.emit('data', Buffer.from('dying words\n'))
      expect(getTrackedPids()).toContain(301)

      child.emit('exit', 1, null)

      expect(getTrackedPids()).not.toContain(301)
      expect(getProjectLogs(301)?.lines).toEqual(['dying words'])

      clearProjectLogs(301)
    })

    it('evicts the oldest exited pid once more than 10 exited processes have logs retained', () => {
      const pids = Array.from({ length: 11 }, (_, i) => 400 + i)
      for (const pid of pids) {
        const { child } = mockChildWithStreams(pid)
        spawnCaptured('/usr/bin/godot', ['--path', '/tmp/project'])
        child.emit('exit', 0, null)
      }

      // oldest exited pid's logs were evicted to bound memory
      expect(getProjectLogs(pids[0])).toBeUndefined()
      // the most recent 10 exited pids are still retained
      for (const pid of pids.slice(1)) {
        expect(getProjectLogs(pid)).toBeDefined()
      }

      for (const pid of pids.slice(1)) clearProjectLogs(pid)
    })

    it('does not let a reused PID stale exited-entry evict a currently-live process with the same PID', () => {
      const pid = 800

      // First instance of this PID runs and exits -- its stale bookkeeping entry lands
      // in the exited-pid FIFO (as the oldest entry).
      const first = mockChildWithStreams(pid)
      spawnCaptured('/usr/bin/godot', ['--path', '/tmp/project'])
      first.child.emit('exit', 0, null)
      expect(getProjectLogs(pid)).toBeDefined()

      // The OS reuses the same PID for a brand-new, currently-live process.
      const { stdout } = mockChildWithStreams(pid)
      spawnCaptured('/usr/bin/godot', ['--path', '/tmp/project'])
      stdout.emit('data', Buffer.from('reused pid output\n'))
      expect(getTrackedPids()).toContain(pid)

      // Drive 10 unrelated exits -- enough to trigger eviction of the FIFO's oldest entry
      // if the stale entry for `pid` from the first instance was not de-duplicated on respawn.
      const otherPids = Array.from({ length: 10 }, (_, i) => 900 + i)
      for (const otherPid of otherPids) {
        const { child } = mockChildWithStreams(otherPid)
        spawnCaptured('/usr/bin/godot', ['--path', '/tmp/project'])
        child.emit('exit', 0, null)
      }

      // The reused PID's currently-live process must still have its output -- not silently
      // wiped out by eviction of the first (exited) instance's stale FIFO entry.
      expect(getProjectLogs(pid)?.lines).toEqual(['reused pid output'])

      clearProjectLogs(pid)
      for (const otherPid of otherPids) clearProjectLogs(otherPid)
    })

    it('never evicts a still-live pid, even after 11 other processes have exited', () => {
      const { stdout } = mockChildWithStreams(500)
      spawnCaptured('/usr/bin/godot', ['--path', '/tmp/project'])
      stdout.emit('data', Buffer.from('still running\n'))

      for (let i = 0; i < 11; i++) {
        const { child } = mockChildWithStreams(600 + i)
        spawnCaptured('/usr/bin/godot', ['--path', '/tmp/project'])
        child.emit('exit', 0, null)
      }

      expect(getProjectLogs(500)?.lines).toEqual(['still running'])
      expect(getTrackedPids()).toContain(500)

      clearProjectLogs(500)
      for (let i = 0; i < 11; i++) clearProjectLogs(600 + i)
    })

    it('does not resurrect eviction bookkeeping for a pid whose logs were already cleared before it exited', () => {
      const { child, stdout } = mockChildWithStreams(700)
      spawnCaptured('/usr/bin/godot', ['--path', '/tmp/project'])
      stdout.emit('data', Buffer.from('line\n'))

      clearProjectLogs(700) // e.g. `project stop` already ran
      child.emit('exit', 0, null) // async exit event arrives afterward

      expect(getProjectLogs(700)).toBeUndefined()
      expect(getTrackedPids()).not.toContain(700)
    })
  })

  // ==========================================
  // killProcessTree
  // ==========================================
  describe('killProcessTree', () => {
    const originalPlatform = process.platform

    afterEach(() => {
      Object.defineProperty(process, 'platform', { value: originalPlatform, configurable: true })
    })

    it('sends SIGTERM on non-win32 platforms and reports the process was alive', () => {
      Object.defineProperty(process, 'platform', { value: 'linux', configurable: true })
      const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => true)

      expect(killProcessTree(1234)).toBe(true)
      expect(killSpy).toHaveBeenCalledWith(1234, 'SIGTERM')
      killSpy.mockRestore()
    })

    it('returns false on non-win32 when the process is already dead', () => {
      Object.defineProperty(process, 'platform', { value: 'linux', configurable: true })
      const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => {
        throw new Error('ESRCH')
      })

      expect(killProcessTree(1234)).toBe(false)
      killSpy.mockRestore()
    })

    it('tree-kills via taskkill on win32 when the liveness probe succeeds', () => {
      Object.defineProperty(process, 'platform', { value: 'win32', configurable: true })
      const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => true)

      expect(killProcessTree(4321)).toBe(true)
      expect(killSpy).toHaveBeenCalledWith(4321, 0)
      expect(child_process.execFileSync).toHaveBeenCalledWith('taskkill', ['/F', '/PID', '4321', '/T'], {
        stdio: 'pipe',
      })
      killSpy.mockRestore()
    })

    it('skips taskkill on win32 when the liveness probe fails (already dead)', () => {
      Object.defineProperty(process, 'platform', { value: 'win32', configurable: true })
      const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => {
        throw new Error('already dead')
      })

      expect(killProcessTree(4321)).toBe(false)
      expect(child_process.execFileSync).not.toHaveBeenCalled()
      killSpy.mockRestore()
    })

    it('returns false and does not throw if taskkill itself throws on win32', () => {
      Object.defineProperty(process, 'platform', { value: 'win32', configurable: true })
      const killSpy = vi.spyOn(process, 'kill').mockImplementation(() => true)
      vi.mocked(child_process.execFileSync).mockImplementationOnce(() => {
        throw new Error('taskkill failed')
      })

      expect(killProcessTree(4321)).toBe(false)
      killSpy.mockRestore()
    })
  })

  // ==========================================
  // launchGodotEditor
  // ==========================================
  describe('launchGodotEditor', () => {
    it('should spawn Godot editor with --editor and --path flags', () => {
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

    it('should return undefined pid when editor spawn fails', () => {
      const mockChild = { unref: vi.fn(), pid: undefined }
      vi.mocked(child_process.spawn).mockReturnValue(mockChild as never)

      const result = launchGodotEditor('/usr/bin/godot', '/tmp/project')
      expect(result.pid).toBeUndefined()
    })

    it('should throw if editor spawn throws synchronously', () => {
      vi.mocked(child_process.spawn).mockImplementationOnce(() => {
        throw new Error('Spawn failed')
      })

      expect(() => launchGodotEditor('/usr/bin/godot', '/tmp/project')).toThrow('Spawn failed')
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

    it('should fall back to Unknown error when error has no message and no stderr', async () => {
      const error = new Error()
      error.message = ''
      execFileAsyncMock.mockRejectedValue(error)

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
      expect(result.exitCode).toBe(0)
    })

    it('should return empty strings when success stdout and stderr are null', async () => {
      execFileAsyncMock.mockResolvedValue({
        stdout: null as unknown as string,
        stderr: null as unknown as string,
      })

      const result = await execGodotAsync('/usr/bin/godot', ['--version'])
      expect(result.success).toBe(true)
      expect(result.stdout).toBe('')
      expect(result.stderr).toBe('')
      expect(result.exitCode).toBe(0)
    })

    it('should fall back to error.message when stderr is whitespace only', async () => {
      const error = Object.assign(new Error('fail message'), { stderr: '   ' })
      execFileAsyncMock.mockRejectedValue(error)

      const result = await execGodotAsync('/usr/bin/godot', ['--version'])
      expect(result.success).toBe(false)
      expect(result.stderr).toBe('fail message')
    })

    it('should handle non-Error catch values', async () => {
      execFileAsyncMock.mockRejectedValue('string error')

      const result = await execGodotAsync('/usr/bin/godot', ['--version'])
      expect(result.success).toBe(false)
      expect(result.stderr).toBe('Unknown error')
      expect(result.exitCode).toBe(1)
    })

    it('should fall back to exitCode 1 when error has no code', async () => {
      const error = new Error('fail')
      delete (error as { code?: number }).code
      execFileAsyncMock.mockRejectedValue(error)

      const result = await execGodotAsync('/usr/bin/godot', ['--version'])
      expect(result.success).toBe(false)
      expect(result.exitCode).toBe(1)
    })
    it('should handle null catch value', async () => {
      execFileAsyncMock.mockRejectedValue(null)

      const result = await execGodotAsync('/usr/bin/godot', ['--version'])
      expect(result.success).toBe(false)
      expect(result.stderr).toBe('Unknown error')
      expect(result.exitCode).toBe(1)
    })
    it('should handle undefined catch value', async () => {
      execFileAsyncMock.mockRejectedValue(undefined)

      const result = await execGodotAsync('/usr/bin/godot', ['--version'])
      expect(result.success).toBe(false)
      expect(result.stderr).toBe('Unknown error')
      expect(result.exitCode).toBe(1)
    })
    it('should handle error with non-string stdout gracefully', async () => {
      const error = Object.assign(new Error('fail'), { stdout: 123 })
      execFileAsyncMock.mockRejectedValue(error)

      const result = await execGodotAsync('/usr/bin/godot', ['--version'])
      expect(result.success).toBe(false)
      expect(result.stdout).toBe('')
    })

    it('should handle error with non-string stderr gracefully', async () => {
      const error = Object.assign(new Error('fail message'), { stderr: { some: 'object' } })
      execFileAsyncMock.mockRejectedValue(error)

      const result = await execGodotAsync('/usr/bin/godot', ['--version'])
      expect(result.success).toBe(false)
      expect(result.stderr).toBe('fail message')
    })

    it('should handle error with non-number code gracefully', async () => {
      const error = Object.assign(new Error('fail'), { code: 'EPERM' })
      execFileAsyncMock.mockRejectedValue(error)

      const result = await execGodotAsync('/usr/bin/godot', ['--version'])
      expect(result.success).toBe(false)
      expect(result.exitCode).toBe(1)
    })

    it('should handle error with non-string message gracefully', async () => {
      const error = { message: 123 }
      execFileAsyncMock.mockRejectedValue(error)

      const result = await execGodotAsync('/usr/bin/godot', ['--version'])
      expect(result.success).toBe(false)
      expect(result.stderr).toBe('Unknown error')
    })
  })
})
