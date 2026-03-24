/**
 * Integration tests for Editor tool
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GodotConfig } from '../../src/godot/types.js'
import { handleEditor } from '../../src/tools/composite/editor.js'
import { createTmpProject, makeConfig } from '../fixtures.js'

vi.mock('../../src/godot/headless.js', () => ({
  launchGodotEditor: vi.fn(() => ({ pid: 12345 })),
}))

describe('editor', () => {
  let projectPath: string
  let cleanup: () => void
  let config: GodotConfig

  beforeEach(() => {
    const tmp = createTmpProject()
    projectPath = tmp.projectPath
    cleanup = tmp.cleanup
    config = makeConfig({ projectPath })
  })

  afterEach(() => cleanup())

  // ==========================================
  // launch
  // ==========================================
  describe('launch', () => {
    it('should launch editor and return PID in message', async () => {
      config = makeConfig({ godotPath: '/usr/bin/godot', projectPath })

      const result = await handleEditor('launch', { project_path: projectPath }, config)

      expect(result.content[0].text).toContain('Godot editor launched (PID: 12345)')
    })

    it('should throw GODOT_NOT_FOUND when godotPath is null', async () => {
      config = makeConfig({ projectPath })

      await expect(handleEditor('launch', { project_path: projectPath }, config)).rejects.toThrow('Godot not found')
    })

    it('should throw INVALID_ARGS when no project_path provided', async () => {
      config = makeConfig({ godotPath: '/usr/bin/godot' })

      await expect(handleEditor('launch', {}, config)).rejects.toThrow('No project path specified')
    })

    it('should use config.projectPath when args.project_path not set', async () => {
      config = makeConfig({ godotPath: '/usr/bin/godot', projectPath })

      const result = await handleEditor('launch', {}, config)

      expect(result.content[0].text).toContain('Godot editor launched')
    })
  })

  // ==========================================
  // status
  // ==========================================
  describe('status', () => {
    let processKillSpy: import('vitest').MockInstance

    beforeEach(() => {
      // Mock process.kill to return true for active PIDs
      processKillSpy = vi.spyOn(process, 'kill').mockImplementation((pid, signal) => {
        if (signal !== 0) throw new Error('Unexpected signal')
        if (config.activePids.includes(pid as number)) return true
        throw new Error('Process not found')
      })
    })

    afterEach(() => {
      processKillSpy.mockRestore()
    })

    it('should return JSON with running, processes, and godotPath', async () => {
      config.activePids.push(12345)
      const result = await handleEditor('status', {}, config)
      const data = JSON.parse(result.content[0].text)

      expect(data).toHaveProperty('running')
      expect(data).toHaveProperty('processes')
      expect(data).toHaveProperty('godotPath')
      expect(Array.isArray(data.processes)).toBe(true)
      expect(data.processes.length).toBe(1)
      expect(data.processes[0]).toEqual({ pid: '12345', name: 'godot' })
      expect(typeof data.running).toBe('boolean')
    })

    it('should show not detected when godotPath is null', async () => {
      config = makeConfig()
      const result = await handleEditor('status', {}, config)
      const data = JSON.parse(result.content[0].text)

      expect(data.godotPath).toBe('not detected')
    })

    it('should show running as false when no godot processes active', async () => {
      config = makeConfig()
      const result = await handleEditor('status', {}, config)
      const data = JSON.parse(result.content[0].text)

      // In CI/test environment, no Godot processes should be running
      expect(data.running).toBe(false)
    })
  })

  // ==========================================
  // errors
  // ==========================================
  it('should throw for unknown action', async () => {
    await expect(handleEditor('unknown', {}, config)).rejects.toThrow('Unknown action')
  })
})
