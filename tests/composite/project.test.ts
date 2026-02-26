/**
 * Integration tests for Project tool
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GodotConfig } from '../../src/godot/types.js'
import { handleProject } from '../../src/tools/composite/project.js'
import { createTmpProject, makeConfig } from '../fixtures.js'

// Mock headless execution
vi.mock('../../src/godot/headless.js', () => ({
  execGodotSync: vi.fn().mockReturnValue({ stdout: '4.2.1.stable', stderr: '', exitCode: 0, success: true }),
  runGodotProject: vi.fn().mockReturnValue({ pid: 1234 }),
}))

// Mock child_process for stop action
vi.mock('node:child_process', () => ({
  execSync: vi.fn(),
}))

describe('project', () => {
  let projectPath: string
  let cleanup: () => void
  let config: GodotConfig

  beforeEach(() => {
    const tmp = createTmpProject()
    projectPath = tmp.projectPath
    cleanup = tmp.cleanup
    // Provide a dummy godot path so version/run checks pass
    config = makeConfig({ projectPath, godotPath: '/bin/godot' })
  })

  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
  })

  // ==========================================
  // info
  // ==========================================
  describe('info', () => {
    it('should return project info', async () => {
      const content = `config_version=5

[application]

config/name="Test Project"
run/main_scene="res://main.tscn"
config/features=PackedStringArray("4.2", "Forward Plus")
config/icon="res://icon.svg"

[display]

window/size/viewport_width=1920
window/size/viewport_height=1080
`
      writeFileSync(join(projectPath, 'project.godot'), content)

      const result = await handleProject(
        'info',
        {
          project_path: projectPath,
        },
        config,
      )

      const data = JSON.parse(result.content[0].text)
      expect(data.name).toBe('Test Project')
      expect(data.configVersion).toBe(5)
      expect(data.mainScene).toBe('res://main.tscn')
      expect(data.features).toContain('4.2')
      expect(data.features).toContain('Forward Plus')
      expect(data.settings['display/window/size/viewport_width']).toBe('1920')
    })

    it('should throw if project.godot not found', async () => {
      const emptyDir = join(projectPath, 'empty')
      if (!existsSync(emptyDir)) mkdirSync(emptyDir)

      await expect(
        handleProject(
          'info',
          {
            project_path: emptyDir,
          },
          config,
        ),
      ).rejects.toThrow('No project.godot found')
    })
  })

  // ==========================================
  // version
  // ==========================================
  describe('version', () => {
    it('should return godot version', async () => {
      const result = await handleProject('version', {}, config)
      expect(result.content[0].text).toContain('Godot version: 4.2.1.stable')
    })

    it('should throw if godotPath is not set', async () => {
      await expect(handleProject('version', {}, makeConfig())).rejects.toThrow('Godot not found')
    })
  })

  // ==========================================
  // settings_get
  // ==========================================
  describe('settings_get', () => {
    it('should get specific setting', async () => {
      const content = `[application]
config/name="My Game"`
      writeFileSync(join(projectPath, 'project.godot'), content)

      const result = await handleProject(
        'settings_get',
        {
          project_path: projectPath,
          key: 'application/config/name',
        },
        config,
      )

      const data = JSON.parse(result.content[0].text)
      expect(data.key).toBe('application/config/name')
      expect(data.value).toBe('"My Game"')
    })

    it('should return null for missing setting', async () => {
      const result = await handleProject(
        'settings_get',
        {
          project_path: projectPath,
          key: 'application/missing/key',
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
    it('should set specific setting', async () => {
      const result = await handleProject(
        'settings_set',
        {
          project_path: projectPath,
          key: 'application/config/name',
          value: '"New Name"',
        },
        config,
      )

      expect(result.content[0].text).toContain('Set application/config/name')

      const content = readFileSync(join(projectPath, 'project.godot'), 'utf-8')
      expect(content).toContain('config/name="New Name"')
    })
  })
})
