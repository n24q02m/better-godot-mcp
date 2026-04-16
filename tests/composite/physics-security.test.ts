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

  describe('body_config injection', () => {
    it('should reject newlines in physics properties', async () => {
      createTmpScene(projectPath, 'test.tscn', MINIMAL_TSCN)

      await expect(
        handlePhysics(
          'body_config',
          {
            project_path: projectPath,
            scene_path: 'test.tscn',
            name: 'Root',
            gravity_scale: '1.0\n[injected]\n',
          },
          config,
        ),
      ).rejects.toThrow('Invalid gravity_scale: newlines not allowed')
    })

    it('should reject carriage returns in physics properties', async () => {
      createTmpScene(projectPath, 'test.tscn', MINIMAL_TSCN)

      await expect(
        handlePhysics(
          'body_config',
          {
            project_path: projectPath,
            scene_path: 'test.tscn',
            name: 'Root',
            mass: '10\r[injected]',
          },
          config,
        ),
      ).rejects.toThrow('Invalid mass: newlines not allowed')
    })
  })

  describe('collision_setup injection', () => {
    it('should reject newlines in collision properties', async () => {
      createTmpScene(projectPath, 'test.tscn', MINIMAL_TSCN)

      await expect(
        handlePhysics(
          'collision_setup',
          {
            project_path: projectPath,
            scene_path: 'test.tscn',
            name: 'Root',
            collision_layer: '1\n[injected]',
          },
          config,
        ),
      ).rejects.toThrow('Invalid collision_layer: newlines not allowed')
    })
  })

  describe('set_layer_name injection', () => {
    it('should reject newlines in layer name', async () => {
      await expect(
        handlePhysics(
          'set_layer_name',
          {
            project_path: projectPath,
            layer_number: 1,
            dimension: '2d',
            name: 'Player\n[injected]\ninjected_key="val"',
          },
          config,
        ),
      ).rejects.toThrow('newlines not allowed')
    })

    it('should reject newlines in dimension', async () => {
      await expect(
        handlePhysics(
          'set_layer_name',
          {
            project_path: projectPath,
            layer_number: 1,
            dimension: '2d\n[injected]',
            name: 'Player',
          },
          config,
        ),
      ).rejects.toThrow('newlines not allowed')
    })
  })
})
