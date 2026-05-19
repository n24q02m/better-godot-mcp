import { describe, expect, it, vi } from 'vitest'
import type { GodotConfig } from '../../src/godot/types.js'
import { handleProject } from '../../src/tools/composite/project.js'

vi.mock('../../src/godot/headless.js', () => ({
  runGodotProject: vi.fn().mockReturnValue({ pid: 12345 }),
}))

describe('Scene Argument Injection', () => {
  it('should reject scene_path starting with a hyphen', async () => {
    const config = {
      godotPath: '/path/to/godot',
      projectPath: '/path/to/project',
      activePids: [],
    } as unknown as GodotConfig

    await expect(
      handleProject('run', { project_path: '/path/to/project', scene_path: '--script=malicious.gd' }, config),
    ).rejects.toThrow('Invalid scene path')
  })
})
