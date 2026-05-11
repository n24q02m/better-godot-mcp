import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { handleProject } from '../../src/tools/composite/project.js'
import { makeConfig } from '../fixtures.js'
import { runGodotProject } from '../../src/godot/headless.js'

vi.mock('../../src/godot/headless.js', () => ({
  execGodotAsync: vi.fn(),
  execGodotSync: vi.fn(),
  runGodotProject: vi.fn().mockReturnValue({ pid: 12345 }),
}))

describe('project run security', () => {
  let config: ReturnType<typeof makeConfig>;

  beforeEach(() => {
    config = makeConfig({ projectPath: '/valid/path', godotPath: '/godot' })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('should reject scene_path starting with a hyphen', async () => {
    await expect(
      handleProject('run', { project_path: '/valid/path', scene_path: '--script=malicious.gd' }, config)
    ).rejects.toThrow('Invalid scene path')

    expect(runGodotProject).not.toHaveBeenCalled()
  })
})
