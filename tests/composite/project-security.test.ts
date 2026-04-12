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
  runGodotProject: vi.fn(),
}))

// Mock child_process for stop command
vi.mock('node:child_process', () => ({
  execFileSync: vi.fn(),
}))

import { execGodotAsync } from '../../src/godot/headless.js'

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

  describe('export argument injection prevention', () => {
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
  })
})
