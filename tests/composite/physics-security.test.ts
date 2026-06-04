import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { GodotConfig } from '../../src/godot/types.js'
import { handlePhysics } from '../../src/tools/composite/physics.js'
import { createTmpProject, createTmpScene, makeConfig } from '../fixtures.js'

describe('physics-security', () => {
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

  it('should not duplicate collision properties', async () => {
    const sceneContent =
      '[gd_scene format=3]\n\n[node name="Root" type="Area2D"]\ncollision_layer = 1\ncollision_mask = 1\n'
    createTmpScene(projectPath, 'test.tscn', sceneContent)

    await handlePhysics(
      'collision_setup',
      {
        project_path: projectPath,
        scene_path: 'test.tscn',
        name: 'Root',
        collision_layer: 4,
      },
      config,
    )

    const content = readFileSync(join(projectPath, 'test.tscn'), 'utf-8')
    const matches = content.match(/collision_layer = /g)
    expect(matches).toHaveLength(1)
    expect(content).toContain('collision_layer = 4')
    expect(content).not.toContain('collision_layer = 1')
  })

  it('should handle ReDoS-prone node names safely', async () => {
    // This node name would be problematic with the old RegExp: ([node name="...nodeName..."] [^\]]*\])
    // if nodeName contained something like " (a+)+ "
    const evilNodeName = `Root${'a' * 100}` // Not exactly ReDoS but just checking it works with special names
    const sceneContent = `[gd_scene format=3]\n\n[node name="${evilNodeName}" type="Area2D"]\n`
    createTmpScene(projectPath, 'test.tscn', sceneContent)

    await handlePhysics(
      'collision_setup',
      {
        project_path: projectPath,
        scene_path: 'test.tscn',
        name: evilNodeName,
        collision_layer: 4,
      },
      config,
    )

    const content = readFileSync(join(projectPath, 'test.tscn'), 'utf-8')
    expect(content).toContain('collision_layer = 4')
  })
})
