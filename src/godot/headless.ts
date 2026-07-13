/**
 * Run Godot in headless mode for CLI operations
 */

import { execFile, execFileSync, spawn, spawnSync } from 'node:child_process'
import { promisify } from 'node:util'
import type { HeadlessResult } from './types.js'

const DEFAULT_TIMEOUT_MS = 30_000
const RING_MAX = 400
/** Cap on how many *exited* processes' logs are retained (bounds memory). Live processes are never evicted. */
const MAX_EXITED_LOGS = 10

const execFileAsync = promisify(execFile)

interface LogBuffer {
  lines: string[]
  /** True once at least one line was dropped from the front of the ring buffer. */
  dropped: boolean
}

/** Last RING_MAX stdout/stderr lines per spawned PID, for the `project logs` action. */
const projectLogs = new Map<number, LogBuffer>()

/** Pids with a process currently running -- added at spawn, removed on exit or explicit clear. */
const liveProcessPids = new Set<number>()

/** FIFO of exited pids whose logs are still retained (oldest first); bounds `projectLogs` for finished/crashed runs. */
const exitedPidOrder: number[] = []

/** child.stdout/stderr are typed as plain `Readable`, but the underlying pipe handle exposes `unref()`. */
type UnrefableStream = { unref?: () => void }

/**
 * Execute a Godot command and capture output
 */
export function execGodotSync(
  godotPath: string,
  args: string[],
  options?: { timeout?: number; cwd?: string },
): HeadlessResult {
  const timeout = options?.timeout ?? DEFAULT_TIMEOUT_MS

  const result = spawnSync(godotPath, args, {
    timeout,
    cwd: options?.cwd,
    stdio: ['pipe', 'pipe', 'pipe'],
    encoding: 'utf-8',
  })

  if (result.error || result.status !== 0) {
    const stdout = typeof result.stdout === 'string' ? result.stdout.trim() : ''
    const stderr = typeof result.stderr === 'string' ? result.stderr.trim() : ''
    const message =
      typeof result.error?.message === 'string' && result.error.message ? result.error.message : 'Unknown error'
    const exitCode = typeof result.status === 'number' ? result.status : 1

    return {
      success: false,
      stdout,
      stderr: stderr || message,
      exitCode,
    }
  }

  return {
    success: true,
    stdout: typeof result.stdout === 'string' ? result.stdout.trim() : '',
    stderr: typeof result.stderr === 'string' ? result.stderr.trim() : '',
    exitCode: 0,
  }
}

/**
 * Execute a Godot command asynchronously and capture output
 */
export async function execGodotAsync(
  godotPath: string,
  args: string[],
  options?: { timeout?: number; cwd?: string },
): Promise<HeadlessResult> {
  const timeout = options?.timeout ?? DEFAULT_TIMEOUT_MS

  try {
    const { stdout, stderr } = await execFileAsync(godotPath, args, {
      timeout,
      cwd: options?.cwd,
      encoding: 'utf-8',
    })

    return {
      success: true,
      stdout: stdout?.trim() || '',
      stderr: stderr?.trim() || '',
      exitCode: 0,
    }
  } catch (err: unknown) {
    const error = err && typeof err === 'object' ? (err as Record<string, unknown>) : null
    const stdout = typeof error?.stdout === 'string' ? error.stdout.trim() : ''
    const stderr = typeof error?.stderr === 'string' ? error.stderr.trim() : ''
    const message =
      typeof (err as Error)?.message === 'string' && (err as Error).message ? (err as Error).message : 'Unknown error'
    const exitCode = typeof error?.code === 'number' ? error.code : 1

    return {
      success: false,
      stdout,
      stderr: stderr || message,
      exitCode,
    }
  }
}

function pushLog(pid: number, chunk: Buffer): void {
  const buf = projectLogs.get(pid)
  if (!buf) return
  for (const line of chunk.toString('utf8').split(/\r?\n/)) {
    if (line === '') continue
    buf.lines.push(line)
    if (buf.lines.length > RING_MAX) {
      buf.lines.shift()
      buf.dropped = true
    }
  }
}

/**
 * Called once a spawned process exits. Moves the pid from "live" to "exited" bookkeeping
 * and, if that pushes the exited-with-retained-logs count over MAX_EXITED_LOGS, evicts the
 * oldest exited pid's logs. Logs are kept (not dropped) on exit so `project logs` still
 * works right after a crash -- only capped in count, and only for pids no longer live.
 */
function handleProcessExit(pid: number): void {
  // If clearProjectLogs already ran for this pid (e.g. `project stop`), there is
  // nothing left to retain or evict -- avoid resurrecting stale bookkeeping.
  if (!liveProcessPids.delete(pid)) return

  exitedPidOrder.push(pid)
  if (exitedPidOrder.length > MAX_EXITED_LOGS) {
    const oldest = exitedPidOrder.shift()
    if (oldest !== undefined) projectLogs.delete(oldest)
  }
}

/**
 * Spawn a detached, non-blocking process and capture its stdout/stderr into a
 * per-pid ring buffer (see getProjectLogs). Shared by runGodotProject; exported
 * separately so it can be unit-tested without a real Godot binary.
 */
export function spawnCaptured(bin: string, args: string[]): { pid: number | undefined } {
  const child = spawn(bin, args, {
    detached: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  })

  if (child.pid !== undefined) {
    const pid = child.pid
    // The OS can reuse a pid: if a stale exited-bookkeeping entry for this same pid is
    // still pending eviction, drop it now so it can never evict *this* live process's logs.
    const staleIdx = exitedPidOrder.indexOf(pid)
    if (staleIdx !== -1) exitedPidOrder.splice(staleIdx, 1)
    projectLogs.set(pid, { lines: [], dropped: false })
    liveProcessPids.add(pid)
    child.stdout?.on('data', (chunk: Buffer) => pushLog(pid, chunk))
    child.stderr?.on('data', (chunk: Buffer) => pushLog(pid, chunk))
    child.once('exit', () => handleProcessExit(pid))
    // child.unref() alone does not release the event loop: the piped stdout/stderr
    // handles stay ref'd for as long as the (detached) child keeps running, which
    // would keep this server process alive too. Unref them explicitly. The `Readable`
    // type doesn't declare `unref` but the underlying pipe handle supports it at runtime.
    ;(child.stdout as UnrefableStream | null)?.unref?.()
    ;(child.stderr as UnrefableStream | null)?.unref?.()
  }

  child.unref()

  return { pid: child.pid }
}

/**
 * Run Godot project (non-blocking)
 */
export function runGodotProject(
  godotPath: string,
  projectPath: string,
  scenePath?: string,
): { pid: number | undefined } {
  const args = ['--path', projectPath]
  if (scenePath) {
    args.push(scenePath)
  }

  return spawnCaptured(godotPath, args)
}

/**
 * Last captured output lines for a PID started via runGodotProject/spawnCaptured.
 * Works for both live and recently-exited processes (see MAX_EXITED_LOGS), so
 * `project logs` still works right after a crash.
 */
export function getProjectLogs(pid: number): { lines: string[]; truncated: boolean } | undefined {
  const buf = projectLogs.get(pid)
  if (!buf) return undefined
  return { lines: [...buf.lines], truncated: buf.dropped }
}

/** Drop the ring buffer entry for a PID (call once the process is no longer tracked, e.g. by `project stop`). */
export function clearProjectLogs(pid: number): void {
  projectLogs.delete(pid)
  liveProcessPids.delete(pid)
  const idx = exitedPidOrder.indexOf(pid)
  if (idx !== -1) exitedPidOrder.splice(idx, 1)
}

/** PIDs with a currently-running process (spawned, not yet exited or explicitly cleared). Used for best-effort cleanup on shutdown. */
export function getTrackedPids(): number[] {
  return [...liveProcessPids]
}

/**
 * Best-effort kill of a process, tree-killing on Windows (plain SIGTERM there leaves
 * children of the target process running -- the exact orphan this module exists to fix).
 * Shared by `project stop` and the server shutdown handler. Never throws.
 * Returns true if a kill was actually issued (the process appeared alive), false if it
 * was already gone.
 */
export function killProcessTree(pid: number): boolean {
  try {
    if (process.platform === 'win32') {
      try {
        process.kill(pid, 0) // liveness probe; throws if the process doesn't exist
      } catch {
        return false
      }
      execFileSync('taskkill', ['/F', '/PID', pid.toString(), '/T'], { stdio: 'pipe' })
    } else {
      process.kill(pid, 'SIGTERM')
    }
    return true
  } catch {
    return false
  }
}

/**
 * Launch Godot editor (non-blocking)
 */
export function launchGodotEditor(godotPath: string, projectPath: string): { pid: number | undefined } {
  const child = spawn(godotPath, ['--editor', '--path', projectPath], {
    detached: true,
    stdio: 'ignore',
  })

  child.unref()

  return { pid: child.pid }
}
