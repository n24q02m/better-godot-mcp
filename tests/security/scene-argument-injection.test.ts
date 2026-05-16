import { expect, it, vi, describe, beforeEach } from 'vitest'
import { handleProject } from '../../src/tools/composite/project.js'
import { runGodotProject } from '../../src/godot/headless.js'

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
    const config = { godotPath: '/bin/godot', projectPath: '/tmp/proj', activePids: [] }

    // Simulate malicious input
    const args = {
      action: 'run',
      scene_path: '--script=malicious.gd',
    }

    await expect(handleProject('run', args, config as any)).rejects.toThrow('Invalid scene path')
  })
})
