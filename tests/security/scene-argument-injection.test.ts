import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { GodotConfig } from '../../src/godot/types.js'
import { handleProject } from '../../src/tools/composite/project.js'

vi.mock('../../src/godot/headless.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../../src/godot/headless.js')>()
  return {
    ...actual,
    runGodotProject: vi.fn().mockReturnValue({ pid: 1234 }),
  }
})

describe('Scene Path Argument Injection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should reject scene_path starting with hyphen', async () => {
    const config = { godotPath: '/bin/godot', projectPath: '/tmp/proj', activePids: [] } as unknown as GodotConfig

    // Simulate malicious input
    const args = {
      action: 'run',
      scene_path: '--script=malicious.gd',
    }

    await expect(handleProject('run', args, config)).rejects.toThrow('Invalid scene path')
  })
})
