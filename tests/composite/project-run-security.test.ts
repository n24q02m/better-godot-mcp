import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GodotConfig } from '../../src/godot/types.js'
import { handleProject } from '../../src/tools/composite/project.js'
import { createTmpProject, makeConfig } from '../fixtures.js'

// Mock headless execution
vi.mock('../../src/godot/headless.js', () => ({
  execGodotAsync: vi.fn(),
  execGodotSync: vi.fn(),
  runGodotProject: vi.fn().mockReturnValue({ pid: 123 }),
}))

import { runGodotProject } from '../../src/godot/headless.js'

describe('project run security', () => {
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

  it('should reject scene_path starting with a hyphen', async () => {
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
})
