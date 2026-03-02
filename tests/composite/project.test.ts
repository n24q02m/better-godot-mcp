/**
 * Tests for Project tool
 */

import { execFileSync } from 'node:child_process'
import * as fsNative from 'node:fs'
import { mkdirSync, readFileSync } from 'node:fs'
import * as fsp from 'node:fs/promises'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GodotConfig } from '../../src/godot/types.js'
import { handleProject } from '../../src/tools/composite/project.js'
import { createTmpProject, makeConfig } from '../fixtures.js'

// We need to mock fs to spy on readFile since it's imported as a module in project.ts
vi.mock('node:fs', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs')>()
  return {
    ...actual,
    existsSync: vi.fn(actual.existsSync),
  }
})

vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>()
  return {
    ...actual,
    readFile: vi.fn(actual.readFile),
  }
})

// Mock headless execution
vi.mock('../../src/godot/headless.js', () => ({
  execGodotSync: vi.fn(),
  runGodotProject: vi.fn(),
}))

// Mock child_process for stop command
vi.mock('node:child_process', () => ({
  execFileSync: vi.fn(),
}))

import { execGodotSync, runGodotProject } from '../../src/godot/headless.js'

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

    it('should return project info using mocked readFile', async () => {
      vi.spyOn(fsNative, 'existsSync').mockReturnValue(true)
      vi.spyOn(fsp, 'readFile').mockResolvedValue(
        '[application]\nconfig/name="MockedProject"\nrun/main_scene="res://main.tscn"\nconfig/features=PackedStringArray("4.4", "Forward Plus")\nconfig_version=5',
      )

      const result = await handleProject('info', { project_path: '/fake/path' }, config)
      const data = JSON.parse(result.content[0].text)

      expect(data.name).toBe('MockedProject')
      expect(data.mainScene).toBe('res://main.tscn')
      expect(data.features).toContain('4.4')
      expect(data.configVersion).toBe(5)

      vi.restoreAllMocks()
    })

    it('should throw if project.godot not found', async () => {
      const tmpPath = join(projectPath, 'empty_dir')
      mkdirSync(tmpPath)
      const badConfig = makeConfig({ projectPath: tmpPath })

      await expect(handleProject('info', { project_path: tmpPath }, badConfig)).rejects.toThrow(
        'No project.godot found at',
      )
    })
  })

  // ==========================================
  // version
  // ==========================================
  describe('version', () => {
    it('should return godot version', async () => {
      vi.mocked(execGodotSync).mockReturnValue({ stdout: '4.4.stable', stderr: '', exitCode: 0 })

      const result = await handleProject('version', {}, config)
      expect(result.content[0].text).toContain('Godot version: 4.4.stable')
      expect(execGodotSync).toHaveBeenCalledWith('/path/to/godot', ['--version'])
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
    it('should start godot project using explicitly mocked runGodotProject', async () => {
      const myConfig = makeConfig({ projectPath: '/fake/my_game_dir', godotPath: '/bin/godot4' })
      vi.mocked(runGodotProject).mockReturnValue({ pid: 99999 })

      const result = await handleProject('run', { project_path: '/fake/my_game_dir' }, myConfig)

      expect(result.content[0].text).toContain('PID: 99999')
      expect(runGodotProject).toHaveBeenCalledWith('/bin/godot4', expect.stringContaining('/fake/my_game_dir'))
      vi.mocked(runGodotProject).mockClear()
    })

    it('should start godot project', async () => {
      vi.mocked(runGodotProject).mockReturnValue({ pid: 12345 })

      const result = await handleProject('run', { project_path: projectPath }, config)
      expect(result.content[0].text).toContain('PID: 12345')
      expect(runGodotProject).toHaveBeenCalledWith('/path/to/godot', expect.stringContaining(projectPath))
    })

    it('should throw if godot not found', async () => {
      const badConfig = makeConfig({ projectPath })
      await expect(handleProject('run', {}, badConfig)).rejects.toThrow('Godot not found')
    })
  })

  // ==========================================
  // stop
  // ==========================================
  describe('stop', () => {
    it('should stop godot processes', async () => {
      const result = await handleProject('stop', {}, config)
      expect(result.content[0].text).toContain('Godot processes stopped')
      expect(execFileSync).toHaveBeenCalled()
    })

    it('should handle no running processes gracefully', async () => {
      vi.mocked(execFileSync).mockImplementation(() => {
        throw new Error('Command failed')
      })

      const result = await handleProject('stop', {}, config)
      expect(result.content[0].text).toContain('No running Godot processes found')
    })

    it('should use taskkill on windows', async () => {
      const originalPlatform = process.platform
      Object.defineProperty(process, 'platform', {
        value: 'win32',
      })

      const result = await handleProject('stop', {}, config)
      expect(result.content[0].text).toContain('Godot processes stopped')
      expect(execFileSync).toHaveBeenCalledWith('taskkill', ['/F', '/IM', 'godot.exe', '/T'], { stdio: 'pipe' })

      Object.defineProperty(process, 'platform', {
        value: originalPlatform,
      })
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
  })

  // ==========================================
  // export
  // ==========================================
  describe('export', () => {
    it('should export project', async () => {
      vi.mocked(execGodotSync).mockReturnValue({ stdout: 'Export successful', stderr: '', exitCode: 0 })

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
      expect(execGodotSync).toHaveBeenCalledWith(
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
  })

  // ==========================================
  // invalid action
  // ==========================================
  it('should throw for unknown action', async () => {
    await expect(handleProject('invalid', {}, config)).rejects.toThrow('Unknown action')
  })
})
