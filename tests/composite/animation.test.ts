/**
 * Integration tests for Animation tool
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { GodotConfig } from '../../src/godot/types.js'
import { handleAnimation } from '../../src/tools/composite/animation.js'
import { createTmpProject, createTmpScene, MINIMAL_TSCN, makeConfig } from '../fixtures.js'

describe('animation', () => {
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
  // create_player
  // ==========================================
  describe('create_player', () => {
    it('should create an AnimationPlayer node', async () => {
      createTmpScene(projectPath, 'test.tscn', MINIMAL_TSCN)

      const result = await handleAnimation(
        'create_player',
        {
          project_path: projectPath,
          scene_path: 'test.tscn',
          name: 'AnimPlayer',
        },
        config,
      )

      expect(result.content[0].text).toContain('Created AnimationPlayer')
      const content = readFileSync(join(projectPath, 'test.tscn'), 'utf-8')
      expect(content).toContain('[node name="AnimPlayer" type="AnimationPlayer"]')
    })

    it('should create an AnimationPlayer under a parent', async () => {
      createTmpScene(projectPath, 'test.tscn', MINIMAL_TSCN)

      const result = await handleAnimation(
        'create_player',
        {
          project_path: projectPath,
          scene_path: 'test.tscn',
          name: 'AnimPlayer',
          parent: 'Root',
        },
        config,
      )

      expect(result.content[0].text).toContain('Created AnimationPlayer')
      const content = readFileSync(join(projectPath, 'test.tscn'), 'utf-8')
      expect(content).toContain('[node name="AnimPlayer" type="AnimationPlayer" parent="Root"]')
    })

    it('should throw if scene_path is missing', async () => {
      await expect(
        handleAnimation(
          'create_player',
          {
            project_path: projectPath,
            name: 'AnimPlayer',
          },
          config,
        ),
      ).rejects.toThrow('No scene_path specified')
    })
  })

  // ==========================================
  // add_animation
  // ==========================================
  describe('add_animation', () => {
    it('should add an animation with default settings', async () => {
      createTmpScene(projectPath, 'test.tscn', MINIMAL_TSCN)

      const result = await handleAnimation(
        'add_animation',
        {
          project_path: projectPath,
          scene_path: 'test.tscn',
          anim_name: 'Idle',
        },
        config,
      )

      expect(result.content[0].text).toContain('Added animation: Idle')
      const content = readFileSync(join(projectPath, 'test.tscn'), 'utf-8')
      expect(content).toContain('[sub_resource type="Animation" id="Animation_Idle"]')
      expect(content).toContain('resource_name = "Idle"')
      expect(content).toContain('length = 1')
      expect(content).toContain('loop_mode = 1') // Default loop is true
    })

    it('should add an animation with custom settings', async () => {
      createTmpScene(projectPath, 'test.tscn', MINIMAL_TSCN)

      const result = await handleAnimation(
        'add_animation',
        {
          project_path: projectPath,
          scene_path: 'test.tscn',
          anim_name: 'Run',
          duration: 2.5,
          loop: false,
        },
        config,
      )

      expect(result.content[0].text).toContain('Added animation: Run')
      const content = readFileSync(join(projectPath, 'test.tscn'), 'utf-8')
      expect(content).toContain('[sub_resource type="Animation" id="Animation_Run"]')
      expect(content).toContain('resource_name = "Run"')
      expect(content).toContain('length = 2.5')
      expect(content).toContain('loop_mode = 0')
    })
  })

  // ==========================================
  // add_track
  // ==========================================
  describe('add_track', () => {
    it('should add a track to an existing animation', async () => {
      createTmpScene(projectPath, 'test.tscn', MINIMAL_TSCN)

      // First create the animation
      await handleAnimation(
        'add_animation',
        {
          project_path: projectPath,
          scene_path: 'test.tscn',
          anim_name: 'Walk',
        },
        config,
      )

      const result = await handleAnimation(
        'add_track',
        {
          project_path: projectPath,
          scene_path: 'test.tscn',
          anim_name: 'Walk',
          node_path: 'Sprite',
          property: 'position',
        },
        config,
      )

      expect(result.content[0].text).toContain('Added value track')
      const content = readFileSync(join(projectPath, 'test.tscn'), 'utf-8')
      expect(content).toContain('tracks/value/type = "value"')
      expect(content).toContain('tracks/value/path = NodePath("Sprite:position")')
    })

    it('should throw if animation does not exist', async () => {
      createTmpScene(projectPath, 'test.tscn', MINIMAL_TSCN)

      await expect(
        handleAnimation(
          'add_track',
          {
            project_path: projectPath,
            scene_path: 'test.tscn',
            anim_name: 'NonExistent',
            node_path: 'Sprite',
            property: 'position',
          },
          config,
        ),
      ).rejects.toThrow('Animation "NonExistent" not found')
    })
  })

  // ==========================================
  // add_keyframe
  // ==========================================
  describe('add_keyframe', () => {
    it('should return guidance message', async () => {
      createTmpScene(projectPath, 'test.tscn', MINIMAL_TSCN)

      const result = await handleAnimation(
        'add_keyframe',
        {
          project_path: projectPath,
          scene_path: 'test.tscn',
        },
        config,
      )

      expect(result.content[0].text).toContain('Keyframe addition requires modifying Animation resource data')
    })
  })

  // ==========================================
  // list
  // ==========================================
  describe('list', () => {
    it('should list animations and players', async () => {
      createTmpScene(projectPath, 'test.tscn', MINIMAL_TSCN)

      // Add player
      await handleAnimation(
        'create_player',
        {
          project_path: projectPath,
          scene_path: 'test.tscn',
          name: 'MyAnimPlayer',
        },
        config,
      )

      // Add animation
      await handleAnimation(
        'add_animation',
        {
          project_path: projectPath,
          scene_path: 'test.tscn',
          anim_name: 'Dance',
          duration: 5.0,
        },
        config,
      )

      const result = await handleAnimation(
        'list',
        {
          project_path: projectPath,
          scene_path: 'test.tscn',
        },
        config,
      )

      const data = JSON.parse(result.content[0].text)
      expect(data.scene).toBe('test.tscn')
      expect(data.players).toContain('MyAnimPlayer')
      expect(data.animations).toHaveLength(1)
      expect(data.animations[0]).toMatchObject({
        name: 'Dance',
        duration: '5',
        loop: true,
      })
    })

    it('should handle scene with no animations', async () => {
      createTmpScene(projectPath, 'test.tscn', MINIMAL_TSCN)

      const result = await handleAnimation(
        'list',
        {
          project_path: projectPath,
          scene_path: 'test.tscn',
        },
        config,
      )

      const data = JSON.parse(result.content[0].text)
      expect(data.players).toHaveLength(0)
      expect(data.animations).toHaveLength(0)
    })
  })

  // ==========================================
  // invalid action
  // ==========================================
  it('should throw for unknown action', async () => {
    await expect(handleAnimation('invalid', {}, config)).rejects.toThrow('Unknown action')
  })
})
