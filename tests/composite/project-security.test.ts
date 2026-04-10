/**
 * Security tests for Project tool
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GodotConfig } from '../../src/godot/types.js'
import { handleProject } from '../../src/tools/composite/project.js'
import { createTmpProject, makeConfig } from '../fixtures.js'

vi.mock('../../src/godot/headless.js', () => ({
  execGodotAsync: vi.fn().mockResolvedValue({ success: true, stdout: '', stderr: '', exitCode: 0 }),
  execGodotSync: vi.fn(),
  runGodotProject: vi.fn(),
}))

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

  describe('export argument injection', () => {
    it('should reject preset starting with a hyphen', async () => {
      await expect(
        handleProject(
          'export',
          {
            project_path: projectPath,
            preset: '--script',
            output_path: 'build/game.x86_64',
          },
          config,
        ),
      ).rejects.toThrow('Invalid arguments')
    })

    it('should reject output_path starting with a hyphen', async () => {
      await expect(
        handleProject(
          'export',
          {
            project_path: projectPath,
            preset: 'Linux/X11',
            output_path: '-something',
          },
          config,
        ),
      ).rejects.toThrow('Invalid arguments')
    })

    it('should allow valid preset and output_path', async () => {
      await expect(
        handleProject(
          'export',
          {
            project_path: projectPath,
            preset: 'Linux/X11',
            output_path: 'build/game.x86_64',
          },
          config,
        ),
      ).resolves.not.toThrow()
    })
  })
})
