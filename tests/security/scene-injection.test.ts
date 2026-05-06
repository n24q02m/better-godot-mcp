import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { GodotConfig } from '../../src/godot/types.js'
import { handleAnimation } from '../../src/tools/composite/animation.js'
import { handleNavigation } from '../../src/tools/composite/navigation.js'

describe('Scene Injection Security Tests', () => {
  const projectPath = join(process.cwd(), 'tmp_security_scene_injection_test')
  const config: GodotConfig = { projectPath }

  beforeEach(() => {
    mkdirSync(projectPath, { recursive: true })
    writeFileSync(join(projectPath, 'project.godot'), '[config]')
    writeFileSync(join(projectPath, 'scene.tscn'), '[gd_scene format=3]\n\n[node name="Root" type="Node"]\n')
  })

  afterEach(() => {
    rmSync(projectPath, { recursive: true, force: true })
  })

  describe('Animation Tool', () => {
    it('should reject newlines and quotes in create_player', async () => {
      await expect(
        handleAnimation('create_player', { scene_path: 'scene.tscn', name: 'Player\n[node' }, config),
      ).rejects.toThrow('Invalid characters in parameters')

      await expect(
        handleAnimation('create_player', { scene_path: 'scene.tscn', parent: 'Root"' }, config),
      ).rejects.toThrow('Invalid characters in parameters')
    })

    it('should reject newlines and quotes in add_animation', async () => {
      await expect(
        handleAnimation('add_animation', { scene_path: 'scene.tscn', anim_name: 'Idle\n[resource]' }, config),
      ).rejects.toThrow('Invalid characters in anim_name')
    })

    it('should reject newlines and quotes in add_track', async () => {
      // First create a valid animation
      writeFileSync(
        join(projectPath, 'scene.tscn'),
        '[gd_scene format=3]\n\n[sub_resource type="Animation" id="Animation_Idle"]\n\n[node name="Root" type="Node"]\n',
      )

      await expect(
        handleAnimation(
          'add_track',
          { scene_path: 'scene.tscn', anim_name: 'Idle\n', node_path: 'Root', property: 'position' },
          config,
        ),
      ).rejects.toThrow('Invalid characters in parameters')

      await expect(
        handleAnimation(
          'add_track',
          { scene_path: 'scene.tscn', anim_name: 'Idle', node_path: 'Root\n[ext', property: 'position' },
          config,
        ),
      ).rejects.toThrow('Invalid characters in parameters')

      await expect(
        handleAnimation(
          'add_track',
          { scene_path: 'scene.tscn', anim_name: 'Idle', node_path: 'Root', property: 'position"' },
          config,
        ),
      ).rejects.toThrow('Invalid characters in parameters')
    })
  })

  describe('Navigation Tool', () => {
    it('should reject newlines and quotes in create_region', async () => {
      await expect(
        handleNavigation('create_region', { scene_path: 'scene.tscn', name: 'Nav\n[node' }, config),
      ).rejects.toThrow('Invalid characters in parameters')

      await expect(
        handleNavigation('create_region', { scene_path: 'scene.tscn', parent: 'Root"' }, config),
      ).rejects.toThrow('Invalid characters in parameters')
    })

    it('should reject newlines and quotes in add_agent', async () => {
      await expect(
        handleNavigation('add_agent', { scene_path: 'scene.tscn', name: 'Agent\n[node' }, config),
      ).rejects.toThrow('Invalid characters in parameters')
    })

    it('should reject newlines and quotes in add_obstacle', async () => {
      await expect(
        handleNavigation('add_obstacle', { scene_path: 'scene.tscn', name: 'Obstacle\n[node' }, config),
      ).rejects.toThrow('Invalid characters in parameters')
    })
  })
})
