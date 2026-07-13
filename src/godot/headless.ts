/**
 * Run Godot in headless mode for CLI operations
 */

import { execFile, spawn, spawnSync } from 'node:child_process'
import { promisify } from 'node:util'
import type { HeadlessResult } from './types.js'

const DEFAULT_TIMEOUT_MS = 30_000
const RING_MAX = 400

const execFileAsync = promisify(execFile)

/** Last RING_MAX stdout/stderr lines per spawned PID, for the `project logs` action. */
const projectLogs = new Map<number, string[]>()

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
  const lines = projectLogs.get(pid)
  if (!lines) return
  for (const line of chunk.toString('utf8').split(/\r?\n/)) {
    if (line === '') continue
    lines.push(line)
    if (lines.length > RING_MAX) lines.shift()
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
    projectLogs.set(pid, [])
    child.stdout?.on('data', (chunk: Buffer) => pushLog(pid, chunk))
    child.stderr?.on('data', (chunk: Buffer) => pushLog(pid, chunk))
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

/** Last captured output lines for a PID started via runGodotProject/spawnCaptured. */
export function getProjectLogs(pid: number): { lines: string[]; truncated: boolean } | undefined {
  const lines = projectLogs.get(pid)
  if (!lines) return undefined
  return { lines: [...lines], truncated: lines.length >= RING_MAX }
}

/** Drop the ring buffer entry for a PID (call once the process is no longer tracked). */
export function clearProjectLogs(pid: number): void {
  projectLogs.delete(pid)
}

/** PIDs with a live ring buffer entry, i.e. spawned and not yet cleared. Used for best-effort cleanup on shutdown. */
export function getTrackedPids(): number[] {
  return [...projectLogs.keys()]
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
