import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { GodotConfig } from '../../src/godot/types.js'
import { handlePhysics } from '../../src/tools/composite/physics.js'
import { createTmpProject, createTmpScene, MINIMAL_TSCN, makeConfig } from '../fixtures.js'

describe('physics security', () => {
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

  it('should not allow scene file injection via collision_layer', async () => {
    createTmpScene(projectPath, 'test.tscn', MINIMAL_TSCN)
    const maliciousPayload = '1\n[node name="Injected" type="Node"]\n'

    await expect(
      handlePhysics(
        'collision_setup',
        {
          project_path: projectPath,
          scene_path: 'test.tscn',
          name: 'Root',
          collision_layer: maliciousPayload as unknown as number,
        },
        config,
      ),
    ).rejects.toThrow('Invalid collision_layer: newlines not allowed')

    const content = readFileSync(join(projectPath, 'test.tscn'), 'utf-8')
    expect(content).not.toContain('[node name="Injected"')
  })

  it('should not allow scene file injection via gravity_scale', async () => {
    createTmpScene(projectPath, 'test.tscn', MINIMAL_TSCN)
    const maliciousPayload = '1.0\n[node name="InjectedBody" type="Node"]\n'

    await expect(
      handlePhysics(
        'body_config',
        {
          project_path: projectPath,
          scene_path: 'test.tscn',
          name: 'Root',
          gravity_scale: maliciousPayload as unknown as number,
        },
        config,
      ),
    ).rejects.toThrow('Invalid gravity_scale: newlines not allowed')

    const content = readFileSync(join(projectPath, 'test.tscn'), 'utf-8')
    expect(content).not.toContain('[node name="InjectedBody"')
  })
})
