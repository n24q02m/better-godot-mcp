import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { GodotConfig } from '../../src/godot/types.js'
import { handleSignals } from '../../src/tools/composite/signals.js'
import { createTmpProject, createTmpScene, MINIMAL_TSCN, makeConfig } from '../fixtures.js'

describe('signal connection injection security', () => {
  let projectPath: string
  let cleanup: () => void
  let config: GodotConfig

  beforeEach(() => {
    const tmp = createTmpProject()
    projectPath = tmp.projectPath
    cleanup = tmp.cleanup
    config = makeConfig({ projectPath })
  })

  afterEach(() => cleanup())

  it('should reject quote injection in connect', async () => {
    createTmpScene(projectPath, 'test.tscn', MINIMAL_TSCN)

    const maliciousMethod = 'my_method" extra_attr="malicious"'

    await expect(
      handleSignals(
        'connect',
        {
          project_path: projectPath,
          scene_path: 'test.tscn',
          signal: 'ready',
          from: 'Root',
          to: 'Root',
          method: maliciousMethod,
        },
        config,
      ),
    ).rejects.toThrow('Invalid characters in parameters')
  })

  it('should reject newline injection in connect', async () => {
    createTmpScene(projectPath, 'test.tscn', MINIMAL_TSCN)

    const maliciousMethod = 'my_method\n[malicious_section]\n'

    await expect(
      handleSignals(
        'connect',
        {
          project_path: projectPath,
          scene_path: 'test.tscn',
          signal: 'ready',
          from: 'Root',
          to: 'Root',
          method: maliciousMethod,
        },
        config,
      ),
    ).rejects.toThrow('Invalid characters in parameters')
  })

  it('should reject quote injection in disconnect', async () => {
    createTmpScene(projectPath, 'test.tscn', MINIMAL_TSCN)

    const maliciousMethod = 'my_method" extra_attr="malicious"'

    await expect(
      handleSignals(
        'disconnect',
        {
          project_path: projectPath,
          scene_path: 'test.tscn',
          signal: 'ready',
          from: 'Root',
          to: 'Root',
          method: maliciousMethod,
        },
        config,
      ),
    ).rejects.toThrow('Invalid characters in parameters')
  })
})
