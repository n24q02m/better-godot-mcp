import { describe, expect, it, vi } from 'vitest'
import { runGodotProject } from '../../src/godot/headless.js'
import { handleProject } from '../../src/tools/composite/project.js'
import { makeConfig } from '../fixtures.js'

vi.mock('../../src/godot/headless.js', () => ({
  execGodotAsync: vi.fn().mockResolvedValue({ success: true, stdout: '', stderr: '', exitCode: 0 }),
  runGodotProject: vi.fn().mockReturnValue({ pid: 1234 }),
}))

describe('project run security', () => {
  it('should reject scene_path starting with a hyphen', async () => {
    const config = makeConfig({ projectPath: '/tmp/project', godotPath: '/path/to/godot' })
    await expect(
      handleProject(
        'run',
        {
          project_path: '/tmp/project',
          scene_path: '--script=malicious.gd',
        },
        config,
      ),
    ).rejects.toThrow('Invalid scene path')
    expect(runGodotProject).not.toHaveBeenCalled()
  })
})
