/**
 * Run Godot in headless mode for CLI operations
 */

import { execFileSync, spawn } from 'node:child_process'
import type { HeadlessResult } from './types.js'

const DEFAULT_TIMEOUT_MS = 30_000

/**
 * Execute a Godot command and capture output
 */
export function execGodotSync(
  godotPath: string,
  args: string[],
  options?: { timeout?: number; cwd?: string },
): HeadlessResult {
  const timeout = options?.timeout ?? DEFAULT_TIMEOUT_MS

  try {
    const stdout = execFileSync(godotPath, args, {
      timeout,
      cwd: options?.cwd,
      stdio: ['pipe', 'pipe', 'pipe'],
      encoding: 'utf-8',
    })

    return {
      success: true,
      stdout: stdout.trim(),
      stderr: '',
      exitCode: 0,
    }
  } catch (error: unknown) {
    const execError = error as { status?: number; stdout?: string; stderr?: string; message?: string }
    return {
      success: false,
      stdout: (execError.stdout as string) || '',
      stderr: (execError.stderr as string) || execError.message || 'Unknown error',
      exitCode: execError.status ?? 1,
    }
  }
}

/**
 * Execute a Godot headless script and capture JSON output
 */
export function execGodotScript(
  godotPath: string,
  scriptPath: string,
  projectPath: string,
  args?: string[],
  options?: { timeout?: number },
): HeadlessResult {
  const godotArgs = ['--headless', '--path', projectPath, '--script', scriptPath]
  if (args) {
    godotArgs.push('--', ...args)
  }

  return execGodotSync(godotPath, godotArgs, options)
}

/**
 * Run Godot project (non-blocking)
 */
export function runGodotProject(godotPath: string, projectPath: string): { pid: number | undefined } {
  const child = spawn(godotPath, ['--path', projectPath], {
    detached: true,
    stdio: 'ignore',
  })

  child.unref()

  return { pid: child.pid }
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
