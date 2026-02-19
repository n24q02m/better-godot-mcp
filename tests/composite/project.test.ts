import { execSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, type Mock, vi } from 'vitest'
import { execGodotSync, runGodotProject } from '../../src/godot/headless.js'
import type { GodotConfig } from '../../src/godot/types.js'
import { handleProject } from '../../src/tools/composite/project.js'
import { createTmpProject, makeConfig } from '../fixtures.js'

// Mock node:child_process only for execSync used in 'stop'
vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
  spawn: vi.fn(),
}))

// Mock headless.ts functions
vi.mock('../../src/godot/headless.js', () => ({
  execGodotSync: vi.fn(),
  runGodotProject: vi.fn(),
}))

// Helper type for casting mocks if vi.mocked doesn't exist
const asMock = (fn: unknown) => fn as Mock

describe('project', () => {
  let projectPath: string
  let cleanup: () => void
  let config: GodotConfig

  beforeEach(() => {
    // Reset mocks
    vi.clearAllMocks()

    // Create temp project
    const tmp = createTmpProject()
    projectPath = tmp.projectPath
    cleanup = tmp.cleanup
    config = makeConfig({
      projectPath,
      godotPath: '/usr/bin/godot', // Mock path
    })
  })

  afterEach(() => cleanup())

  // ==========================================
  // info
  // ==========================================
  describe('info', () => {
    it('should return project info for valid path', async () => {
      const result = await handleProject('info', { project_path: projectPath }, config)
      const data = JSON.parse(result.content[0].text)

      expect(data.name).toBe('TestProject')
      expect(data.mainScene).toBe('res://scenes/main.tscn')
      expect(data.features).toContain('4.4')
      expect(data.configVersion).toBe(5) // Default if not found, or parsed from fixture
    })

    it('should use config projectPath if args missing', async () => {
      const result = await handleProject('info', {}, config)
      const data = JSON.parse(result.content[0].text)
      expect(data.name).toBe('TestProject')
    })

    it('should throw if project_path missing', async () => {
      const emptyConfig = makeConfig()
      await expect(handleProject('info', {}, emptyConfig)).rejects.toThrow('No project path specified')
    })

    it('should throw if project.godot missing', async () => {
      const badPath = join(projectPath, 'missing')
      await expect(handleProject('info', { project_path: badPath }, config)).rejects.toThrow('No project.godot found')
    })
  })

  // ==========================================
  // version
  // ==========================================
  describe('version', () => {
    it('should return godot version', async () => {
      asMock(execGodotSync).mockReturnValue({
        success: true,
        stdout: '4.2.1.stable',
        stderr: '',
        exitCode: 0,
      })

      const result = await handleProject('version', {}, config)
      expect(result.content[0].text).toContain('Godot version: 4.2.1.stable')
      expect(execGodotSync).toHaveBeenCalledWith('/usr/bin/godot', ['--version'])
    })

    it('should throw if godotPath missing', async () => {
      const noGodotConfig = makeConfig({ projectPath })
      await expect(handleProject('version', {}, noGodotConfig)).rejects.toThrow('Godot not found')
    })
  })

  // ==========================================
  // run
  // ==========================================
  describe('run', () => {
    it('should start godot project', async () => {
      asMock(runGodotProject).mockReturnValue({ pid: 12345 })

      const result = await handleProject('run', { project_path: projectPath }, config)
      expect(result.content[0].text).toContain('started (PID: 12345)')
      expect(runGodotProject).toHaveBeenCalledWith('/usr/bin/godot', expect.stringContaining(projectPath))
    })

    it('should throw if godotPath missing', async () => {
      const noGodotConfig = makeConfig({ projectPath })
      await expect(handleProject('run', {}, noGodotConfig)).rejects.toThrow('Godot not found')
    })

    it('should throw if project_path missing', async () => {
      // config has projectPath set in beforeEach, so we need to clear it
      const noProjectConfig = makeConfig({ godotPath: '/usr/bin/godot' })
      await expect(handleProject('run', {}, noProjectConfig)).rejects.toThrow('No project path specified')
    })
  })

  // ==========================================
  // stop
  // ==========================================
  describe('stop', () => {
    it('should stop godot processes', async () => {
      const result = await handleProject('stop', {}, config)
      expect(result.content[0].text).toContain('Godot processes stopped')
      expect(execSync).toHaveBeenCalled()
    })

    it('should handle no running processes', async () => {
      asMock(execSync).mockImplementation(() => {
        throw new Error('Command failed')
      })

      const result = await handleProject('stop', {}, config)
      expect(result.content[0].text).toContain('No running Godot processes found')
    })
  })

  // ==========================================
  // settings_get
  // ==========================================
  describe('settings_get', () => {
    it('should get existing setting', async () => {
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
          key: 'application/config/missing',
        },
        config,
      )
      const data = JSON.parse(result.content[0].text)
      expect(data.value).toBeNull()
    })

    it('should throw if key missing', async () => {
      await expect(handleProject('settings_get', { project_path: projectPath }, config)).rejects.toThrow(
        'No key specified',
      )
    })
  })

  // ==========================================
  // settings_set
  // ==========================================
  describe('settings_set', () => {
    it('should update existing setting', async () => {
      const result = await handleProject(
        'settings_set',
        {
          project_path: projectPath,
          key: 'application/config/name',
          value: '"NewName"',
        },
        config,
      )
      expect(result.content[0].text).toContain('Set application/config/name = "NewName"')

      // Verify file content
      const content = readFileSync(join(projectPath, 'project.godot'), 'utf-8')
      expect(content).toContain('config/name="NewName"')
    })

    it('should add new setting', async () => {
      const result = await handleProject(
        'settings_set',
        {
          project_path: projectPath,
          key: 'application/config/new_setting',
          value: '"NewValue"',
        },
        config,
      )
      expect(result.content[0].text).toContain('Set application/config/new_setting = "NewValue"')

      const content = readFileSync(join(projectPath, 'project.godot'), 'utf-8')
      expect(content).toContain('new_setting="NewValue"')
    })

    it('should throw if value missing', async () => {
      await expect(handleProject('settings_set', { project_path: projectPath, key: 'k' }, config)).rejects.toThrow(
        'key and value required',
      )
    })
  })

  // ==========================================
  // export
  // ==========================================
  describe('export', () => {
    it('should export project', async () => {
      asMock(execGodotSync).mockReturnValue({
        success: true,
        stdout: 'Export success',
        stderr: '',
        exitCode: 0,
      })

      const result = await handleProject(
        'export',
        {
          project_path: projectPath,
          preset: 'Linux',
          output_path: 'build/game.x86_64',
        },
        config,
      )

      expect(result.content[0].text).toContain('Export complete')
      expect(execGodotSync).toHaveBeenCalledWith(
        '/usr/bin/godot',
        expect.arrayContaining(['--export-release', 'Linux']),
      )
    })

    it('should throw if args missing', async () => {
      await expect(handleProject('export', { project_path: projectPath, preset: 'Linux' }, config)).rejects.toThrow(
        'preset and output_path required',
      )
    })
  })

  // ==========================================
  // invalid action
  // ==========================================
  it('should throw for unknown action', async () => {
    await expect(handleProject('invalid', {}, config)).rejects.toThrow('Unknown action')
  })
})
