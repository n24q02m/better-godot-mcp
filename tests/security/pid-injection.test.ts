import * as child_process from 'node:child_process'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { GodotConfig } from '../../src/godot/types.js'
import { handleEditor } from '../../src/tools/composite/editor.js'
import { handleProject } from '../../src/tools/composite/project.js'

// Mock dependencies
vi.mock('node:child_process', () => ({
  execFileSync: vi.fn(),
  spawn: vi.fn(),
  spawnSync: vi.fn(),
}))

vi.mock('../../src/godot/headless.js', () => ({
  execGodotAsync: vi.fn(),
  runGodotProject: vi.fn(),
  launchGodotEditor: vi.fn(),
}))

describe('PID Injection Security Tests', () => {
  afterEach(() => {
    vi.clearAllMocks()
  })

  it('project stop action should ignore invalid PIDs to prevent command injection', async () => {
    // Save original kill
    const originalKill = process.kill
    const killMock = vi.fn()
    process.kill = killMock as unknown as typeof process.kill

    const originalPlatform = Object.getOwnPropertyDescriptor(process, 'platform')
    Object.defineProperty(process, 'platform', { value: 'win32' })

    const maliciousPids: unknown[] = [
      '1234 & echo pwned', // String injection
      '1234; rm -rf /', // String injection
      -1, // Negative number
      0, // Zero
      NaN, // NaN
      Infinity, // Infinity
      3.14, // Float
      {}, // Object
      null, // null
      undefined, // undefined
    ]

    const config: GodotConfig = {
      godotPath: '/path/to/godot',
      godotVersion: null,
      projectPath: '/path/to/project',
      activePids: maliciousPids,
    }

    const result = (await handleProject('stop', {}, config)) as { content: { text: string }[] }

    // Process.kill should not be called at all
    expect(killMock).not.toHaveBeenCalled()
    // execFileSync should not be called (which uses taskkill)
    expect(child_process.execFileSync).not.toHaveBeenCalled()
    expect(result.content[0].text).toContain('Godot processes stopped')
    expect(config.activePids).toEqual([])

    // Restore platform and kill
    if (originalPlatform) {
      Object.defineProperty(process, 'platform', originalPlatform)
    }
    process.kill = originalKill
  })

  it('editor status action should ignore invalid PIDs', async () => {
    // Save original kill
    const originalKill = process.kill
    const killMock = vi.fn()
    process.kill = killMock as unknown as typeof process.kill

    const maliciousPids: unknown[] = ['1234 & echo pwned', -1, 0, NaN, Infinity]

    const config: GodotConfig = {
      godotPath: '/path/to/godot',
      godotVersion: null,
      projectPath: '/path/to/project',
      activePids: maliciousPids,
    }

    const response = (await handleEditor('status', {}, config)) as { content: { text: string }[] }
    const result = JSON.parse(response.content[0].text)

    expect(killMock).not.toHaveBeenCalled()
    expect(result.running).toBe(false)
    expect(result.processes).toEqual([])

    // Restore kill
    process.kill = originalKill
  })

  it('should process valid PIDs correctly', async () => {
    const originalKill = process.kill
    const killMock = vi.fn()
    process.kill = killMock as unknown as typeof process.kill

    const config: GodotConfig = {
      godotPath: '/path/to/godot',
      godotVersion: null,
      projectPath: '/path/to/project',
      activePids: [1234, 5678],
    }

    const response = (await handleEditor('status', {}, config)) as { content: { text: string }[] }
    const result = JSON.parse(response.content[0].text)

    expect(killMock).toHaveBeenCalledTimes(2)
    expect(killMock).toHaveBeenCalledWith(1234, 0)
    expect(killMock).toHaveBeenCalledWith(5678, 0)

    // In our mock kill doesn't throw, so processes are considered running
    expect(result.running).toBe(true)
    expect(result.processes).toEqual([
      { pid: '1234', name: 'godot' },
      { pid: '5678', name: 'godot' },
    ])

    process.kill = originalKill
  })
})
