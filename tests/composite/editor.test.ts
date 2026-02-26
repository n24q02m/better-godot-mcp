import * as child_process from 'node:child_process'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as headless from '../../src/godot/headless.js'
import { handleEditor } from '../../src/tools/composite/editor.js'
import { makeConfig } from '../fixtures.js'

// Mock dependencies
vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}))

vi.mock('../../src/godot/headless.js', () => ({
  launchGodotEditor: vi.fn(),
}))

describe('editor tool', () => {
  let config: ReturnType<typeof makeConfig>

  beforeEach(() => {
    config = makeConfig({
      godotPath: '/usr/bin/godot',
      projectPath: '/tmp/project',
    })
    vi.clearAllMocks()
  })

  describe('launch', () => {
    it('should launch editor with correct path', async () => {
      // Setup mock return
      vi.mocked(headless.launchGodotEditor).mockReturnValue({
        pid: 1234,
        output: '',
        process: {} as unknown as child_process.ChildProcess,
      })

      const result = await handleEditor('launch', { project_path: '/tmp/project' }, config)

      expect(headless.launchGodotEditor).toHaveBeenCalledWith('/usr/bin/godot', '/tmp/project')
      expect(result.content[0].text).toContain('PID: 1234')
    })

    it('should throw if godotPath is missing', async () => {
      config.godotPath = null
      await expect(handleEditor('launch', { project_path: '/tmp/project' }, config)).rejects.toThrow('Godot not found')
    })

    it('should throw if projectPath is missing', async () => {
      config.projectPath = null
      await expect(handleEditor('launch', {}, config)).rejects.toThrow('No project path specified')
    })
  })

  describe('status', () => {
    it('should report running processes (linux/mac)', async () => {
      // Mock execSync to return pgrep output
      vi.mocked(child_process.execSync).mockReturnValue('1234 godot -e\n5678 godot --editor\n')

      const result = await handleEditor('status', {}, config)
      const data = JSON.parse(result.content[0].text)

      expect(data.running).toBe(true)
      expect(data.processes).toHaveLength(2)
      expect(data.processes[0]).toEqual({ pid: '1234', name: 'godot -e' })
    })

    it('should report no running processes', async () => {
      vi.mocked(child_process.execSync).mockReturnValue('')

      const result = await handleEditor('status', {}, config)
      const data = JSON.parse(result.content[0].text)

      expect(data.running).toBe(false)
      expect(data.processes).toHaveLength(0)
    })

    it('should handle execSync errors (no processes)', async () => {
      vi.mocked(child_process.execSync).mockImplementation(() => {
        throw new Error('Command failed')
      })

      const result = await handleEditor('status', {}, config)
      const data = JSON.parse(result.content[0].text)

      expect(data.running).toBe(false)
      expect(data.processes).toHaveLength(0)
    })
  })
})
