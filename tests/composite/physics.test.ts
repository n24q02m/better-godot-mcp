/**
 * Integration tests for Physics tool
 */

import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { GodotConfig } from '../../src/godot/types.js'
import { handlePhysics } from '../../src/tools/composite/physics.js'
import { createTmpProject, createTmpScene, MINIMAL_TSCN, makeConfig } from '../fixtures.js'

describe('physics', () => {
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

  // ==========================================
  // layers
  // ==========================================
  describe('layers', () => {
    it('should list 2d and 3d physics layers', async () => {
      // Setup project.godot with layer names
      const projectGodotPath = join(projectPath, 'project.godot')
      const content = `[layer_names]
2d_physics/layer_1="Player"
2d_physics/layer_2="Enemy"
3d_physics/layer_1="World"
3d_physics/layer_3="Trigger"
`
      writeFileSync(projectGodotPath, content, 'utf-8')

      const result = await handlePhysics('layers', { project_path: projectPath }, config)
      const data = JSON.parse(result.content[0].text)

      expect(data.layers2d['2d_physics/layer_1']).toBe('Player')
      expect(data.layers2d['2d_physics/layer_2']).toBe('Enemy')
      expect(data.layers3d['3d_physics/layer_1']).toBe('World')
      expect(data.layers3d['3d_physics/layer_3']).toBe('Trigger')
    })

    it('should return empty objects if no layers defined', async () => {
      const result = await handlePhysics('layers', { project_path: projectPath }, config)
      const data = JSON.parse(result.content[0].text)

      expect(data.layers2d).toEqual({})
      expect(data.layers3d).toEqual({})
    })
  })

  // ==========================================
  // collision_setup
  // ==========================================
  describe('collision_setup', () => {
    it('should set collision layer and mask on a node', async () => {
      createTmpScene(projectPath, 'test.tscn', MINIMAL_TSCN)

      const result = await handlePhysics(
        'collision_setup',
        {
          project_path: projectPath,
          scene_path: 'test.tscn',
          name: 'Root',
          collision_layer: 2,
          collision_mask: 5,
        },
        config,
      )

      expect(result.content[0].text).toContain('Set collision')
      const content = readFileSync(join(projectPath, 'test.tscn'), 'utf-8')
      expect(content).toContain('collision_layer = 2')
      expect(content).toContain('collision_mask = 5')
    })

    it('should update existing collision properties', async () => {
      const sceneContent = `[gd_scene format=3]

[node name="Root" type="Area2D"]
collision_layer = 1
collision_mask = 1
`
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
      expect(content).toContain('collision_layer = 4')
      // With the new implementation using updateNodeInScene, it should NOT have duplicates.
      const layerMatches = content.match(/collision_layer = 4/g)
      expect(layerMatches).toHaveLength(1)
      expect(content).not.toContain('collision_layer = 1')
    })

    it('should throw if scene not found', async () => {
      await expect(
        handlePhysics(
          'collision_setup',
          {
            project_path: projectPath,
            scene_path: 'nonexistent.tscn',
            name: 'Root',
          },
          config,
        ),
      ).rejects.toThrow('Scene not found')
    })

    it('should throw if node not found', async () => {
      createTmpScene(projectPath, 'test.tscn', MINIMAL_TSCN)
      await expect(
        handlePhysics(
          'collision_setup',
          {
            project_path: projectPath,
            scene_path: 'test.tscn',
            name: 'MissingNode',
          },
          config,
        ),
      ).rejects.toThrow('Node "MissingNode" not found')
    })
  })

  // ==========================================
  // body_config
  // ==========================================
  describe('body_config', () => {
    it('should configure physics body properties', async () => {
      createTmpScene(projectPath, 'test.tscn', MINIMAL_TSCN)

      const result = await handlePhysics(
        'body_config',
        {
          project_path: projectPath,
          scene_path: 'test.tscn',
          name: 'Root',
          gravity_scale: 0.5,
          mass: 10,
          freeze: true,
        },
        config,
      )

      expect(result.content[0].text).toContain('Configured physics body')
      const content = readFileSync(join(projectPath, 'test.tscn'), 'utf-8')
      expect(content).toContain('gravity_scale = 0.5')
      expect(content).toContain('mass = 10')
      expect(content).toContain('freeze = true')
    })

    it('should update existing physics properties without duplication', async () => {
      const sceneContent = `[gd_scene format=3]

[node name="Root" type="RigidBody2D"]
mass = 1.0
gravity_scale = 1.0
`
      createTmpScene(projectPath, 'test.tscn', sceneContent)

      await handlePhysics(
        'body_config',
        {
          project_path: projectPath,
          scene_path: 'test.tscn',
          name: 'Root',
          mass: 5.0,
          gravity_scale: 0.5,
        },
        config,
      )

      const content = readFileSync(join(projectPath, 'test.tscn'), 'utf-8')
      expect(content).toContain('mass = 5')
      expect(content).toContain('gravity_scale = 0.5')

      const massMatches = content.match(/mass = 5/g)
      expect(massMatches).toHaveLength(1)
      expect(content).not.toContain('mass = 1.0')
    })
  })

  // ==========================================
  // set_layer_name
  // ==========================================
  describe('set_layer_name', () => {
    it('should set 2d layer name', async () => {
      const result = await handlePhysics(
        'set_layer_name',
        {
          project_path: projectPath,
          layer_number: 1,
          dimension: '2d',
          name: 'Player',
        },
        config,
      )

      expect(result.content[0].text).toContain('Set 2d physics layer 1: "Player"')
      const content = readFileSync(join(projectPath, 'project.godot'), 'utf-8')
      expect(content).toContain('2d_physics/layer_1="Player"')
    })

    it('should set 3d layer name', async () => {
      await handlePhysics(
        'set_layer_name',
        {
          project_path: projectPath,
          layer_number: 5,
          dimension: '3d',
          name: 'Environment',
        },
        config,
      )

      const content = readFileSync(join(projectPath, 'project.godot'), 'utf-8')
      expect(content).toContain('3d_physics/layer_5="Environment"')
    })
  })

  // ==========================================
  // errors
  // ==========================================
  describe('errors', () => {
    it('should throw for unknown action', async () => {
      await expect(handlePhysics('unknown_action', {}, config)).rejects.toThrow('Unknown action')
    })

    it('should throw if project path is missing for layers', async () => {
      // Temporarily override config to null
      const emptyConfig = makeConfig({ projectPath: null })
      await expect(handlePhysics('layers', { project_path: '' }, emptyConfig)).rejects.toThrow(
        'No project path specified',
      )
    })
  })
})
