/**
 * Integration tests for Nodes tool
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { GodotConfig } from '../../src/godot/types.js'
import { handleNodes } from '../../src/tools/composite/nodes.js'
import { COMPLEX_TSCN, createTmpProject, createTmpScene, MINIMAL_TSCN, makeConfig } from '../fixtures.js'

describe('nodes', () => {
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
  // add
  // ==========================================
  describe('add', () => {
    it('should add a node to scene', async () => {
      createTmpScene(projectPath, 'test.tscn')

      const result = await handleNodes(
        'add',
        {
          project_path: projectPath,
          scene_path: 'test.tscn',
          name: 'Player',
          type: 'CharacterBody2D',
        },
        config,
      )

      expect(result.content[0].text).toContain('Added node')
      const content = readFileSync(join(projectPath, 'test.tscn'), 'utf-8')
      expect(content).toContain('name="Player"')
      expect(content).toContain('type="CharacterBody2D"')
    })

    it('should add node with parent', async () => {
      createTmpScene(projectPath, 'test.tscn', COMPLEX_TSCN)

      const result = await handleNodes(
        'add',
        {
          project_path: projectPath,
          scene_path: 'test.tscn',
          name: 'HealthBar',
          type: 'ProgressBar',
          parent: 'UI',
        },
        config,
      )

      expect(result.content[0].text).toContain('Added node')
      const content = readFileSync(join(projectPath, 'test.tscn'), 'utf-8')
      expect(content).toContain('name="HealthBar"')
      expect(content).toContain('parent="UI"')
    })

    it('should throw for duplicate node name at same parent', async () => {
      createTmpScene(projectPath, 'test.tscn', COMPLEX_TSCN)

      await expect(
        handleNodes(
          'add',
          {
            project_path: projectPath,
            scene_path: 'test.tscn',
            name: 'Sprite',
            type: 'Sprite2D',
          },
          config,
        ),
      ).rejects.toThrow('already exists')
    })

    it('should throw for missing scene', async () => {
      await expect(
        handleNodes(
          'add',
          {
            project_path: projectPath,
            scene_path: 'ghost.tscn',
            name: 'Node',
          },
          config,
        ),
      ).rejects.toThrow('not found')
    })
  })

  // ==========================================
  // remove
  // ==========================================
  describe('remove', () => {
    it('should remove a node from scene', async () => {
      createTmpScene(projectPath, 'test.tscn', COMPLEX_TSCN)

      const result = await handleNodes(
        'remove',
        {
          project_path: projectPath,
          scene_path: 'test.tscn',
          name: 'Camera',
        },
        config,
      )

      expect(result.content[0].text).toContain('Removed node')
      const content = readFileSync(join(projectPath, 'test.tscn'), 'utf-8')
      expect(content).not.toContain('name="Camera"')
    })
  })

  // ==========================================
  // rename
  // ==========================================
  describe('rename', () => {
    it('should rename a node', async () => {
      createTmpScene(projectPath, 'test.tscn', COMPLEX_TSCN)

      const result = await handleNodes(
        'rename',
        {
          project_path: projectPath,
          scene_path: 'test.tscn',
          name: 'Sprite',
          new_name: 'PlayerSprite',
        },
        config,
      )

      expect(result.content[0].text).toContain('Renamed')
      const content = readFileSync(join(projectPath, 'test.tscn'), 'utf-8')
      expect(content).toContain('name="PlayerSprite"')
      expect(content).not.toContain('name="Sprite"')
    })
  })

  // ==========================================
  // list
  // ==========================================
  describe('list', () => {
    it('should list all nodes with info', async () => {
      createTmpScene(projectPath, 'test.tscn', COMPLEX_TSCN)

      const result = await handleNodes(
        'list',
        {
          project_path: projectPath,
          scene_path: 'test.tscn',
        },
        config,
      )

      const data = JSON.parse(result.content[0].text)
      expect(data.nodeCount).toBeGreaterThan(0)
      expect(data.nodes[0]).toHaveProperty('name')
      expect(data.nodes[0]).toHaveProperty('type')
    })

    it('should list single node in minimal scene', async () => {
      createTmpScene(projectPath, 'test.tscn', MINIMAL_TSCN)

      const result = await handleNodes(
        'list',
        {
          project_path: projectPath,
          scene_path: 'test.tscn',
        },
        config,
      )

      const data = JSON.parse(result.content[0].text)
      expect(data.nodeCount).toBe(1)
      expect(data.nodes[0].name).toBe('Root')
    })
  })

  // ==========================================
  // set_property
  // ==========================================
  describe('set_property', () => {
    it('should set property on a node', async () => {
      createTmpScene(projectPath, 'test.tscn', MINIMAL_TSCN)

      const result = await handleNodes(
        'set_property',
        {
          project_path: projectPath,
          scene_path: 'test.tscn',
          name: 'Root',
          property: 'visible',
          value: 'false',
        },
        config,
      )

      expect(result.content[0].text).toContain('Set visible')
      const content = readFileSync(join(projectPath, 'test.tscn'), 'utf-8')
      expect(content).toContain('visible = false')
    })

    it('should replace existing property', async () => {
      createTmpScene(projectPath, 'test.tscn', COMPLEX_TSCN)

      await handleNodes(
        'set_property',
        {
          project_path: projectPath,
          scene_path: 'test.tscn',
          name: 'Player',
          property: 'speed',
          value: '500',
        },
        config,
      )

      const content = readFileSync(join(projectPath, 'test.tscn'), 'utf-8')
      expect(content).toContain('speed = 500')
    })
  })

  // ==========================================
  // get_property
  // ==========================================
  describe('get_property', () => {
    it('should get property value', async () => {
      createTmpScene(projectPath, 'test.tscn', COMPLEX_TSCN)

      const result = await handleNodes(
        'get_property',
        {
          project_path: projectPath,
          scene_path: 'test.tscn',
          name: 'Player',
          property: 'speed',
        },
        config,
      )

      const data = JSON.parse(result.content[0].text)
      expect(data.value).toBe('300')
    })

    it('should return null for missing property', async () => {
      createTmpScene(projectPath, 'test.tscn', COMPLEX_TSCN)

      const result = await handleNodes(
        'get_property',
        {
          project_path: projectPath,
          scene_path: 'test.tscn',
          name: 'Player',
          property: 'nonexistent',
        },
        config,
      )

      const data = JSON.parse(result.content[0].text)
      expect(data.value).toBeNull()
    })
  })

  // ==========================================
  // invalid action
  // ==========================================
  it('should throw for unknown action', async () => {
    await expect(handleNodes('invalid', {}, config)).rejects.toThrow('Unknown action')
  })
})
