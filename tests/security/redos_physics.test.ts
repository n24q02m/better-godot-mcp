import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { GodotConfig } from '../../src/godot/types.js'
import { handlePhysics } from '../../src/tools/composite/physics.js'
import { createTmpProject, createTmpScene, makeConfig } from '../fixtures.js'

describe('Physics ReDoS Security', () => {
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

  it('should not be vulnerable to ReDoS in collision_setup via node name', async () => {
    // This node name is crafted to be slow on vulnerable regex: [node name="..."][^]*]
    // Although the specific vulnerability was name specific, we test long input.
    const longNodeName = `A${'B'.repeat(50000)}C`
    const sceneContent = '[gd_scene format=3]\n\n[node name="Root" type="Node"]\n'
    createTmpScene(projectPath, 'test.tscn', sceneContent)

    const startTime = Date.now()
    await expect(
      handlePhysics(
        'collision_setup',
        {
          project_path: projectPath,
          scene_path: 'test.tscn',
          name: longNodeName,
          collision_layer: 1,
        },
        config,
      ),
    ).rejects.toThrow(/Node ".*" not found/)
    const duration = Date.now() - startTime

    // If it's slow, it's a sign of ReDoS. Usually ReDoS takes seconds or minutes.
    // 1 second is very generous for a simple string search.
    expect(duration).toBeLessThan(1000)
  })

  it('should not be vulnerable to ReDoS in body_config via node name', async () => {
    const longNodeName = `A${'B'.repeat(50000)}C`
    const sceneContent = '[gd_scene format=3]\n\n[node name="Root" type="Node"]\n'
    createTmpScene(projectPath, 'test.tscn', sceneContent)

    const startTime = Date.now()
    await expect(
      handlePhysics(
        'body_config',
        {
          project_path: projectPath,
          scene_path: 'test.tscn',
          name: longNodeName,
          gravity_scale: 1.0,
        },
        config,
      ),
    ).rejects.toThrow(/Node ".*" not found/)
    const duration = Date.now() - startTime

    expect(duration).toBeLessThan(1000)
  })
})
