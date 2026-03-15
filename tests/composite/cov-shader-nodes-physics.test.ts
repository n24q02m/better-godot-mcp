/**
 * Coverage tests for shader, nodes, physics edge cases
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { GodotConfig } from '../../src/godot/types.js'
import { handleNodes } from '../../src/tools/composite/nodes.js'
import { handlePhysics } from '../../src/tools/composite/physics.js'
import { handleShader } from '../../src/tools/composite/shader.js'
import { createTmpProject, createTmpScene, makeConfig } from '../fixtures.js'

describe('shader/nodes/physics coverage', () => {
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

  // shader
  describe('shader', () => {
    it('create should throw for missing shader_path', async () => {
      await expect(handleShader('create', { project_path: projectPath }, config)).rejects.toThrow(
        'No shader_path specified',
      )
    })
    it('read should throw for missing shader_path', async () => {
      await expect(handleShader('read', { project_path: projectPath }, config)).rejects.toThrow(
        'No shader_path specified',
      )
    })
    it('write should throw for missing shader_path', async () => {
      await expect(handleShader('write', { project_path: projectPath }, config)).rejects.toThrow(
        'No shader_path specified',
      )
    })
    it('write should throw for missing content', async () => {
      await expect(
        handleShader('write', { project_path: projectPath, shader_path: 'x.gdshader' }, config),
      ).rejects.toThrow('No content specified')
    })
    it('get_params should throw for missing shader_path', async () => {
      await expect(handleShader('get_params', { project_path: projectPath }, config)).rejects.toThrow(
        'No shader_path specified',
      )
    })
    it('get_params should throw for non-existent shader', async () => {
      await expect(
        handleShader('get_params', { project_path: projectPath, shader_path: 'ghost.gdshader' }, config),
      ).rejects.toThrow('not found')
    })
    it('list should throw for missing project_path', async () => {
      await expect(handleShader('list', {}, makeConfig())).rejects.toThrow('No project path specified')
    })
    it('create should use custom content', async () => {
      const c = 'shader_type fog;\nvoid fog() {}\n'
      await handleShader('create', { project_path: projectPath, shader_path: 'c.gdshader', content: c }, config)
      expect(readFileSync(join(projectPath, 'c.gdshader'), 'utf-8')).toBe(c)
    })
    it('create should fallback for unknown type', async () => {
      await handleShader('create', { project_path: projectPath, shader_path: 'u.gdshader', shader_type: 'xyz' }, config)
      expect(readFileSync(join(projectPath, 'u.gdshader'), 'utf-8')).toContain('shader_type canvas_item')
    })
  })

  // nodes
  describe('nodes', () => {
    it('add: missing scene_path', async () => {
      await expect(handleNodes('add', { project_path: projectPath, name: 'T' }, config)).rejects.toThrow(
        'No scene_path specified',
      )
    })
    it('add: missing name', async () => {
      createTmpScene(projectPath, 't.tscn')
      await expect(handleNodes('add', { project_path: projectPath, scene_path: 't.tscn' }, config)).rejects.toThrow(
        'No node name specified',
      )
    })
    it('set_property: missing args', async () => {
      createTmpScene(projectPath, 't.tscn')
      await expect(
        handleNodes('set_property', { project_path: projectPath, scene_path: 't.tscn' }, config),
      ).rejects.toThrow('name, property, and value required')
    })
    it('set_property: missing scene', async () => {
      await expect(
        handleNodes(
          'set_property',
          { project_path: projectPath, scene_path: 'x.tscn', name: 'R', property: 'p', value: '1' },
          config,
        ),
      ).rejects.toThrow('Scene not found')
    })
    it('get_property: missing args', async () => {
      createTmpScene(projectPath, 't.tscn')
      await expect(
        handleNodes('get_property', { project_path: projectPath, scene_path: 't.tscn' }, config),
      ).rejects.toThrow('name and property required')
    })
    it('get_property: missing scene', async () => {
      await expect(
        handleNodes(
          'get_property',
          { project_path: projectPath, scene_path: 'x.tscn', name: 'R', property: 'p' },
          config,
        ),
      ).rejects.toThrow('Scene not found')
    })
    it('list: missing scene_path', async () => {
      await expect(handleNodes('list', { project_path: projectPath }, config)).rejects.toThrow(
        'No scene_path specified',
      )
    })
    it('list: missing scene', async () => {
      await expect(handleNodes('list', { project_path: projectPath, scene_path: 'x.tscn' }, config)).rejects.toThrow(
        'Scene not found',
      )
    })
    it('rename: missing scene_path', async () => {
      await expect(
        handleNodes('rename', { project_path: projectPath, name: 'A', new_name: 'B' }, config),
      ).rejects.toThrow('No scene_path specified')
    })
    it('rename: missing new_name', async () => {
      createTmpScene(projectPath, 't.tscn')
      await expect(
        handleNodes('rename', { project_path: projectPath, scene_path: 't.tscn', name: 'A' }, config),
      ).rejects.toThrow('Both name and new_name required')
    })
    it('rename: missing scene', async () => {
      await expect(
        handleNodes('rename', { project_path: projectPath, scene_path: 'x.tscn', name: 'A', new_name: 'B' }, config),
      ).rejects.toThrow('Scene not found')
    })
  })

  // physics
  describe('physics', () => {
    it('layers: project.godot not found', async () => {
      await expect(handlePhysics('layers', { project_path: 'nonexistent' }, config)).rejects.toThrow(
        'No project.godot found',
      )
    })
    it('body_config: missing scene_path', async () => {
      await expect(handlePhysics('body_config', { project_path: projectPath, name: 'R' }, config)).rejects.toThrow(
        'No scene_path specified',
      )
    })
    it('body_config: missing name', async () => {
      createTmpScene(projectPath, 't.tscn')
      await expect(
        handlePhysics('body_config', { project_path: projectPath, scene_path: 't.tscn' }, config),
      ).rejects.toThrow('No node name specified')
    })
    it('body_config: missing scene', async () => {
      await expect(
        handlePhysics('body_config', { project_path: projectPath, scene_path: 'x.tscn', name: 'R' }, config),
      ).rejects.toThrow('Scene not found')
    })
    it('body_config: missing node', async () => {
      createTmpScene(projectPath, 't.tscn')
      await expect(
        handlePhysics('body_config', { project_path: projectPath, scene_path: 't.tscn', name: 'Ghost' }, config),
      ).rejects.toThrow('Node "Ghost" not found')
    })
    it('body_config: linear_damp and angular_damp', async () => {
      createTmpScene(projectPath, 't.tscn')
      await handlePhysics(
        'body_config',
        { project_path: projectPath, scene_path: 't.tscn', name: 'Root', linear_damp: 0.5, angular_damp: 0.3 },
        config,
      )
      const c = readFileSync(join(projectPath, 't.tscn'), 'utf-8')
      expect(c).toContain('linear_damp = 0.5')
      expect(c).toContain('angular_damp = 0.3')
    })
    it('collision_setup: missing scene_path', async () => {
      await expect(handlePhysics('collision_setup', { project_path: projectPath, name: 'R' }, config)).rejects.toThrow(
        'No scene_path specified',
      )
    })
    it('collision_setup: missing name', async () => {
      createTmpScene(projectPath, 't.tscn')
      await expect(
        handlePhysics('collision_setup', { project_path: projectPath, scene_path: 't.tscn' }, config),
      ).rejects.toThrow('No node name specified')
    })
    it('set_layer_name: missing project_path', async () => {
      await expect(handlePhysics('set_layer_name', { name: 'P' }, makeConfig())).rejects.toThrow(
        'No project path specified',
      )
    })
    it('set_layer_name: missing name', async () => {
      await expect(handlePhysics('set_layer_name', { project_path: projectPath }, config)).rejects.toThrow(
        'No name specified',
      )
    })
    it('set_layer_name: project.godot not found', async () => {
      await expect(handlePhysics('set_layer_name', { project_path: 'nonexistent', name: 'P' }, config)).rejects.toThrow(
        'No project.godot found',
      )
    })
  })
})
