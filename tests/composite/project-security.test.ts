/**
 * Security tests for Project tool
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GodotConfig } from '../../src/godot/types.js'
import { handleProject } from '../../src/tools/composite/project.js'
import { createTmpProject, makeConfig } from '../fixtures.js'

// Mock headless execution
vi.mock('../../src/godot/headless.js', () => ({
  execGodotAsync: vi.fn().mockResolvedValue({ success: true, stdout: '', stderr: '', exitCode: 0 }),
  execGodotSync: vi.fn(),
  runGodotProject: vi.fn().mockReturnValue({ pid: 12345 }),
}))

// Mock child_process for stop command
vi.mock('node:child_process', () => ({
  execFileSync: vi.fn(),
}))

import { execGodotAsync, runGodotProject } from '../../src/godot/headless.js'

describe('project security', () => {
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

  describe('argument injection prevention', () => {
    it('should reject preset starting with a hyphen', async () => {
      await expect(
        handleProject(
          'export',
          {
            project_path: projectPath,
            preset: '--script=malicious.gd',
            output_path: 'build/game.exe',
          },
          config,
        ),
      ).rejects.toThrow('Invalid arguments')

      expect(execGodotAsync).not.toHaveBeenCalled()
    })

    it('should reject output_path starting with a hyphen', async () => {
      await expect(
        handleProject(
          'export',
          {
            project_path: projectPath,
            preset: 'Windows Desktop',
            output_path: '--script=malicious.gd',
          },
          config,
        ),
      ).rejects.toThrow('Invalid arguments')

      expect(execGodotAsync).not.toHaveBeenCalled()
    })

    it('should reject project_path starting with a hyphen', async () => {
      await expect(
        handleProject(
          'export',
          {
            project_path: '--some-arg',
            preset: 'Windows Desktop',
            output_path: 'build/game.exe',
          },
          config,
        ),
      ).rejects.toThrow('Invalid project path')

      expect(execGodotAsync).not.toHaveBeenCalled()
    })

    it('should allow valid preset and output_path', async () => {
      const result = await handleProject(
        'export',
        {
          project_path: projectPath,
          preset: 'Windows Desktop',
          output_path: 'build/game.exe',
        },
        config,
      )

      expect(result.content[0].text).toContain('Export complete: build/game.exe')
      expect(execGodotAsync).toHaveBeenCalled()
    })

    it('should reject scene_path starting with a hyphen on run action', async () => {
      await expect(
        handleProject(
          'run',
          {
            project_path: projectPath,
            scene_path: '--script=malicious.gd',
          },
          config,
        ),
      ).rejects.toThrow('Invalid scene path')

      expect(runGodotProject).not.toHaveBeenCalled()
    })

    it('should reject scene_path with a leading hyphen even if it looks pathy', async () => {
      await expect(
        handleProject(
          'run',
          {
            project_path: projectPath,
            scene_path: '-x',
          },
          config,
        ),
      ).rejects.toThrow('Invalid scene path')

      expect(runGodotProject).not.toHaveBeenCalled()
    })

    it('should reject scene_path containing a newline on run action', async () => {
      await expect(
        handleProject(
          'run',
          {
            project_path: projectPath,
            scene_path: 'main.tscn\n--script=bad.gd',
          },
          config,
        ),
      ).rejects.toThrow('Invalid scene path')

      expect(runGodotProject).not.toHaveBeenCalled()
    })

    it('should reject non-string scene_path on run action', async () => {
      await expect(
        handleProject(
          'run',
          {
            project_path: projectPath,
            scene_path: 42,
          },
          config,
        ),
      ).rejects.toThrow('Invalid scene path')

      expect(runGodotProject).not.toHaveBeenCalled()
    })

    it('should allow a safe scene_path on run action', async () => {
      const result = await handleProject(
        'run',
        {
          project_path: projectPath,
          scene_path: 'scenes/main.tscn',
        },
        config,
      )

      expect(result.content[0].text).toContain('Godot project started')
      expect(runGodotProject).toHaveBeenCalled()
    })

    it('should reject preset or output_path that are not strings', async () => {
      await expect(
        handleProject(
          'export',
          {
            project_path: projectPath,
            preset: 123,
            output_path: 'build/game.exe',
          },
          config,
        ),
      ).rejects.toThrow('Invalid arguments')

      await expect(
        handleProject(
          'export',
          {
            project_path: projectPath,
            preset: 'Windows Desktop',
            output_path: true,
          },
          config,
        ),
      ).rejects.toThrow('Invalid arguments')
    })
  })
})
