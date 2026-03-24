/**
 * Tests for editor.ts - process checking branches
 */

import { afterEach, beforeEach, describe, expect, it, type MockInstance, vi } from 'vitest'
import type { GodotConfig } from '../../src/godot/types.js'
import { handleEditor } from '../../src/tools/composite/editor.js'
import { makeConfig } from '../fixtures.js'

vi.mock('../../src/godot/headless.js', () => ({
  launchGodotEditor: vi.fn(() => ({ pid: 12345 })),
}))

describe('editor - process checking', () => {
  let config: GodotConfig
  let processKillSpy: MockInstance

  beforeEach(() => {
    vi.clearAllMocks()
    config = makeConfig({ godotPath: '/usr/bin/godot' })

    // Default spy behavior
    processKillSpy = vi.spyOn(process, 'kill').mockImplementation((pid, signal) => {
      if (signal !== 0) throw new Error('Unexpected signal')
      if (config.activePids.includes(pid as number)) return true
      throw new Error('Process not found')
    })
  })

  afterEach(() => {
    processKillSpy.mockRestore()
  })

  it('status should return active processes when kill(0) succeeds', async () => {
    config.activePids = [1234, 5678]

    const result = await handleEditor('status', {}, config)
    const data = JSON.parse(result.content[0].text)

    expect(data.running).toBe(true)
    expect(data.processes).toHaveLength(2)
    expect(data.processes).toEqual([
      { pid: '1234', name: 'godot' },
      { pid: '5678', name: 'godot' },
    ])
    expect(processKillSpy).toHaveBeenCalledTimes(2)
  })

  it('status should filter out dead processes when kill(0) fails', async () => {
    config.activePids = [1234, 9999, 5678]

    processKillSpy.mockImplementation((pid, _signal) => {
      if (pid === 9999) throw new Error('ESRCH')
      return true
    })

    const result = await handleEditor('status', {}, config)
    const data = JSON.parse(result.content[0].text)

    expect(data.running).toBe(true)
    expect(data.processes).toHaveLength(2)
    expect(data.processes).toEqual([
      { pid: '1234', name: 'godot' },
      { pid: '5678', name: 'godot' },
    ])
    expect(processKillSpy).toHaveBeenCalledTimes(3)
  })

  it('status should handle no active processes', async () => {
    config.activePids = []

    const result = await handleEditor('status', {}, config)
    const data = JSON.parse(result.content[0].text)

    expect(data.running).toBe(false)
    expect(data.processes).toEqual([])
    expect(processKillSpy).not.toHaveBeenCalled()
  })
})
