import { execFileSync } from 'node:child_process'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GodotConfig } from '../../src/godot/types.js'
import { handleEditor } from '../../src/tools/composite/editor.js'
import { handleProject } from '../../src/tools/composite/project.js'

vi.mock('node:child_process')

describe('PID Validation Security', () => {
  let originalPlatform: string
  let processKillSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.resetAllMocks()
    originalPlatform = process.platform
    Object.defineProperty(process, 'platform', { value: 'win32' })
    processKillSpy = vi.spyOn(process, 'kill').mockImplementation(() => true)
  })

  afterEach(() => {
    Object.defineProperty(process, 'platform', { value: originalPlatform })
    processKillSpy.mockRestore()
  })

  it('should ignore malicious non-integer PIDs when stopping project', async () => {
    const config: GodotConfig = {
      godotPath: '/path/to/godot',
      godotVersion: null,
      projectPath: '/path/to/project',
      // @ts-expect-error - simulating malicious injection
      activePids: ['123";calc.exe', -1, 0, 3.14, NaN, Infinity, 1234],
    }

    const result = await handleProject('stop', {}, config)

    // Only the valid PID (1234) should have been processed
    expect(processKillSpy).toHaveBeenCalledTimes(1)
    expect(processKillSpy).toHaveBeenCalledWith(1234, 0)

    expect(execFileSync).toHaveBeenCalledTimes(1)
    expect(execFileSync).toHaveBeenCalledWith('taskkill', ['/F', '/PID', '1234', '/T'], expect.anything())

    expect(config.activePids).toHaveLength(0)
    expect(result.content[0].text).toContain('Stopped 1 tracked processes')
  })

  it('should ignore malicious non-integer PIDs when checking editor status', async () => {
    const config: GodotConfig = {
      godotPath: '/path/to/godot',
      godotVersion: null,
      projectPath: '/path/to/project',
      // @ts-expect-error - simulating malicious injection
      activePids: ['123";calc.exe', -1, 0, 3.14, NaN, Infinity, 5678],
    }

    const result = await handleEditor('status', {}, config)
    const json = JSON.parse(result.content[0].text)

    // Only the valid PID (5678) should have been processed
    expect(processKillSpy).toHaveBeenCalledTimes(1)
    expect(processKillSpy).toHaveBeenCalledWith(5678, 0)

    expect(json.processes).toHaveLength(1)
    expect(json.processes[0].pid).toBe('5678')
  })
})
