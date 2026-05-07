/**
 * Tests for Project tool
 */

import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GodotConfig } from '../../src/godot/types.js'
import { handleProject } from '../../src/tools/composite/project.js'
import { createTmpProject, makeConfig } from '../fixtures.js'

// Mock headless execution
vi.mock('../../src/godot/headless.js', () => ({
  execGodotAsync: vi.fn().mockResolvedValue({ success: true, stdout: '', stderr: '', exitCode: 0 }),
  execGodotSync: vi.fn(),
  runGodotProject: vi.fn(),
}))

// Mock child_process for stop command
vi.mock('node:child_process', () => ({
  execFileSync: vi.fn(),
}))

import { execGodotAsync, runGodotProject } from '../../src/godot/headless.js'

describe('project', () => {
  let projectPath: string
  let cleanup: () => void
  let config: GodotConfig

  beforeEach(() => {
    const tmp = createTmpProject()
    projectPath = tmp.projectPath
    cleanup = tmp.cleanup
    config = makeConfig({ projectPath, godotPath: '/path/to/godot' })
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  // ==========================================
  // info
  // ==========================================
  describe('info', () => {
    it('should return project info', async () => {
      const result = await handleProject('info', { project_path: projectPath }, config)
      const data = JSON.parse(result.content[0].text)

      expect(data.name).toBe('TestProject')
      expect(data.mainScene).toBe('res://scenes/main.tscn')
      expect(data.features).toContain('4.4')
    })

    it('should use config.projectPath if not provided', async () => {
      const result = await handleProject('info', {}, config)
      const data = JSON.parse(result.content[0].text)
      expect(data.name).toBe('TestProject')
    })

    it('should throw if no project path', async () => {
      const badConfig = makeConfig()
      await expect(handleProject('info', {}, badConfig)).rejects.toThrow('No project path specified')
    })

    it('should throw for non-existent project directory', async () => {
      // The path should be inside the config project path to test "not found" instead of "access denied"
      await expect(handleProject('info', { project_path: 'nonexistent' }, config)).rejects.toThrow(
        'No project.godot found',
      )
    })
  })

  // ==========================================
  // version
  // ==========================================
  describe('version', () => {
    it('should return godot version', async () => {
      vi.mocked(execGodotAsync).mockResolvedValue({ stdout: '4.4.stable', stderr: '', exitCode: 0, success: true })

      const result = await handleProject('version', {}, config)
      expect(result.content[0].text).toContain('Godot version: 4.4.stable')
      expect(execGodotAsync).toHaveBeenCalledWith('/path/to/godot', ['--version'])
    })

    it('should throw if godot not found', async () => {
      const badConfig = makeConfig({ projectPath }) // godotPath is null
      await expect(handleProject('version', {}, badConfig)).rejects.toThrow('Godot not found')
    })
  })

  // ==========================================
  // run
  // ==========================================
  describe('run', () => {
    it('should start godot project', async () => {
      vi.mocked(runGodotProject).mockReturnValue({ pid: 12345 })

      const result = await handleProject('run', { project_path: projectPath }, config)
      expect(result.content[0].text).toContain('PID: 12345')
      expect(runGodotProject).toHaveBeenCalledWith('/path/to/godot', projectPath, undefined)
    })

    it('should start godot project with scene', async () => {
      vi.mocked(runGodotProject).mockReturnValue({ pid: 12345 })

      const result = await handleProject('run', { project_path: projectPath, scene_path: 'scenes/test.tscn' }, config)
      expect(result.content[0].text).toContain('PID: 12345')
      expect(result.content[0].text).toContain('for scene scenes/test.tscn')
      expect(runGodotProject).toHaveBeenCalledWith('/path/to/godot', projectPath, 'scenes/test.tscn')
    })

    it('should throw if godot not found', async () => {
      const badConfig = makeConfig({ projectPath })
      await expect(handleProject('run', {}, badConfig)).rejects.toThrow('Godot not found')
    })

    it('should throw if no project path', async () => {
      const noProjectConfig = makeConfig({ godotPath: '/usr/bin/godot' })
      await expect(handleProject('run', {}, noProjectConfig)).rejects.toThrow('No project path specified')
    })
  })

  // ==========================================
  // stop
  // ==========================================
  describe('stop', () => {
    it('should stop godot processes', async () => {
      config.activePids = [1234]
      const processKillSpy = vi.spyOn(process, 'kill').mockImplementation(() => true)

      const result = await handleProject('stop', {}, config)
      expect(result.content[0].text).toContain('Godot processes stopped')
      if (process.platform === 'win32') {
        expect(execFileSync).toHaveBeenCalled()
      } else {
        expect(processKillSpy).toHaveBeenCalledWith(1234, 'SIGTERM')
      }
      expect(config.activePids).toHaveLength(0)

      processKillSpy.mockRestore()
    })

    it('should handle no running processes gracefully', async () => {
      const result = await handleProject('stop', {}, config)
      expect(result.content[0].text).toContain('No running Godot processes found (tracked by this server)')
    })
  })

  // ==========================================
  // settings_get
  // ==========================================
  describe('settings_get', () => {
    it('should get setting value', async () => {
      const result = await handleProject(
        'settings_get',
        {
          project_path: projectPath,
          key: 'application/config/name',
        },
        config,
      )
      const data = JSON.parse(result.content[0].text)
      expect(data.value).toBe('"TestProject"')
    })

    it('should return null for missing setting', async () => {
      const result = await handleProject(
        'settings_get',
        {
          project_path: projectPath,
          key: 'non/existent/key',
        },
        config,
      )
      const data = JSON.parse(result.content[0].text)
      expect(data.value).toBeNull()
    })

    it('should throw for missing key', async () => {
      await expect(handleProject('settings_get', { project_path: projectPath }, config)).rejects.toThrow(
        'No key specified',
      )
    })

    it('should throw for missing project.godot', async () => {
      await expect(handleProject('settings_get', { project_path: 'nonexistent', key: 'a' }, config)).rejects.toThrow(
        'No project.godot found',
      )
    })
  })

  // ==========================================
  // settings_set
  // ==========================================
  describe('settings_set', () => {
    it('should set existing setting', async () => {
      await handleProject(
        'settings_set',
        {
          project_path: projectPath,
          key: 'application/config/name',
          value: '"NewName"',
        },
        config,
      )

      const content = readFileSync(join(projectPath, 'project.godot'), 'utf-8')
      expect(content).toContain('config/name="NewName"')
    })

    it('should add new setting', async () => {
      await handleProject(
        'settings_set',
        {
          project_path: projectPath,
          key: 'debug/settings/fps/force_fps',
          value: '60',
        },
        config,
      )

      const content = readFileSync(join(projectPath, 'project.godot'), 'utf-8')
      expect(content).toContain('[debug]')
      expect(content).toContain('settings/fps/force_fps=60')
    })

    it('should throw for missing key/value', async () => {
      await expect(handleProject('settings_set', { project_path: projectPath, key: 'k' }, config)).rejects.toThrow(
        'key and value required',
      )
    })

    it('should throw for missing project.godot', async () => {
      await expect(
        handleProject('settings_set', { project_path: 'nonexistent', key: 'test/key', value: 'value' }, config),
      ).rejects.toThrow('No project.godot found')
    })
  })

  // ==========================================
  // export
  // ==========================================
  describe('export', () => {
    it('should export project', async () => {
      vi.mocked(execGodotAsync).mockResolvedValue({
        stdout: 'Export successful',
        stderr: '',
        exitCode: 0,
        success: true,
      })

      const result = await handleProject(
        'export',
        {
          project_path: projectPath,
          preset: 'Linux/X11',
          output_path: 'build/game.x86_64',
        },
        config,
      )

      expect(result.content[0].text).toContain('Export complete')
      expect(execGodotAsync).toHaveBeenCalledWith(
        '/path/to/godot',
        expect.arrayContaining(['--export-release', 'Linux/X11']),
      )
    })

    it('should throw if missing args', async () => {
      await expect(
        handleProject(
          'export',
          {
            project_path: projectPath,
            preset: 'Linux/X11',
            // missing output_path
          },
          config,
        ),
      ).rejects.toThrow('preset and output_path required')
    })

    it('should throw for missing godotPath', async () => {
      const noGodotConfig = makeConfig({ projectPath })
      await expect(
        handleProject('export', { project_path: projectPath, preset: 'Web', output_path: 'o' }, noGodotConfig),
      ).rejects.toThrow('Godot not found')
    })

    it('should throw for missing project_path', async () => {
      await expect(
        handleProject('export', { preset: 'Web', output_path: 'o' }, makeConfig({ godotPath: '/usr/bin/godot' })),
      ).rejects.toThrow('No project path specified')
    })
  })

  // ==========================================
  // invalid action
  // ==========================================
  it('should throw for unknown action', async () => {
    await expect(handleProject('invalid', {}, config)).rejects.toThrow('Unknown action')
  })
})
