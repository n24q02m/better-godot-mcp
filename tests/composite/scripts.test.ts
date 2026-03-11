/**
 * Integration tests for Scripts tool
 */

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { GodotConfig } from '../../src/godot/types.js'
import { handleScripts } from '../../src/tools/composite/scripts.js'
import { createTmpProject, createTmpScene, createTmpScript, MINIMAL_TSCN, makeConfig } from '../fixtures.js'

describe('scripts', () => {
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
  // create
  // ==========================================
  describe('create', () => {
    it('should throw on path traversal attempt', async () => {
      await expect(
        handleScripts(
          'create',
          {
            project_path: projectPath,
            script_path: '../malicious.gd',
          },
          config,
        ),
      ).rejects.toThrow('Access denied')
    })

    it('should create script with default template', async () => {
      const result = await handleScripts(
        'create',
        {
          project_path: projectPath,
          script_path: 'player.gd',
        },
        config,
      )

      expect(result.content[0].text).toContain('Created script')
      const content = readFileSync(join(projectPath, 'player.gd'), 'utf-8')
      expect(content).toContain('extends Node')
    })

    it('should create script with CharacterBody2D template', async () => {
      await handleScripts(
        'create',
        {
          project_path: projectPath,
          script_path: 'hero.gd',
          extends: 'CharacterBody2D',
        },
        config,
      )

      const content = readFileSync(join(projectPath, 'hero.gd'), 'utf-8')
      expect(content).toContain('extends CharacterBody2D')
      expect(content).toContain('SPEED')
    })

    it('should create script with custom content', async () => {
      const customContent = 'extends Sprite2D\n\nfunc flip(): pass\n'
      await handleScripts(
        'create',
        {
          project_path: projectPath,
          script_path: 'custom.gd',
          content: customContent,
        },
        config,
      )

      const content = readFileSync(join(projectPath, 'custom.gd'), 'utf-8')
      expect(content).toBe(customContent)
    })

    it('should create script in nested directory', async () => {
      await handleScripts(
        'create',
        {
          project_path: projectPath,
          script_path: 'scripts/player/movement.gd',
        },
        config,
      )

      expect(existsSync(join(projectPath, 'scripts/player/movement.gd'))).toBe(true)
    })

    it('should throw if script already exists', async () => {
      createTmpScript(projectPath, 'existing.gd')

      await expect(
        handleScripts(
          'create',
          {
            project_path: projectPath,
            script_path: 'existing.gd',
          },
          config,
        ),
      ).rejects.toThrow('already exists')
    })
  })

  // ==========================================
  // read
  // ==========================================
  describe('read', () => {
    it('should throw on path traversal attempt', async () => {
      await expect(
        handleScripts(
          'read',
          {
            project_path: projectPath,
            script_path: '../../etc/passwd',
          },
          config,
        ),
      ).rejects.toThrow('Access denied')
    })

    it('should read script content', async () => {
      createTmpScript(projectPath, 'test.gd', 'extends Node\n\nvar hp = 100\n')

      const result = await handleScripts(
        'read',
        {
          project_path: projectPath,
          script_path: 'test.gd',
        },
        config,
      )

      expect(result.content[0].text).toContain('var hp = 100')
    })

    it('should throw for missing script', async () => {
      await expect(
        handleScripts(
          'read',
          {
            project_path: projectPath,
            script_path: 'ghost.gd',
          },
          config,
        ),
      ).rejects.toThrow('not found')
    })
  })

  // ==========================================
  // write
  // ==========================================
  describe('write', () => {
    it('should throw on path traversal attempt', async () => {
      await expect(
        handleScripts(
          'write',
          {
            project_path: projectPath,
            script_path: '../outside.gd',
            content: 'malicious',
          },
          config,
        ),
      ).rejects.toThrow('Access denied')
    })

    it('should write content to script', async () => {
      const newContent = 'extends Node2D\n\nfunc shoot(): pass\n'
      await handleScripts(
        'write',
        {
          project_path: projectPath,
          script_path: 'weapon.gd',
          content: newContent,
        },
        config,
      )

      const content = readFileSync(join(projectPath, 'weapon.gd'), 'utf-8')
      expect(content).toBe(newContent)
    })

    it('should overwrite existing script', async () => {
      createTmpScript(projectPath, 'old.gd', 'extends Node\n')
      const newContent = 'extends Node2D\n'

      await handleScripts(
        'write',
        {
          project_path: projectPath,
          script_path: 'old.gd',
          content: newContent,
        },
        config,
      )

      const content = readFileSync(join(projectPath, 'old.gd'), 'utf-8')
      expect(content).toBe(newContent)
    })
  })

  // ==========================================
  // list
  // ==========================================
  describe('list', () => {
    it('should find scripts recursively', async () => {
      createTmpScript(projectPath, 'main.gd')
      createTmpScript(projectPath, 'scripts/player.gd')
      createTmpScript(projectPath, 'scripts/enemy/boss.gd')

      const result = await handleScripts(
        'list',
        {
          project_path: projectPath,
        },
        config,
      )

      const data = JSON.parse(result.content[0].text)
      expect(data.count).toBe(3)
      expect(data.scripts).toContain('main.gd')
    })

    it('should return empty list when no scripts', async () => {
      const result = await handleScripts(
        'list',
        {
          project_path: projectPath,
        },
        config,
      )

      const data = JSON.parse(result.content[0].text)
      expect(data.count).toBe(0)
    })
  })

  // ==========================================
  // delete
  // ==========================================
  describe('delete', () => {
    it('should throw on path traversal attempt', async () => {
      await expect(
        handleScripts(
          'delete',
          {
            project_path: projectPath,
            script_path: '../important.gd',
          },
          config,
        ),
      ).rejects.toThrow('Access denied')
    })

    it('should delete existing script', async () => {
      createTmpScript(projectPath, 'to_delete.gd')

      const result = await handleScripts(
        'delete',
        {
          project_path: projectPath,
          script_path: 'to_delete.gd',
        },
        config,
      )

      expect(result.content[0].text).toContain('Deleted')
      expect(existsSync(join(projectPath, 'to_delete.gd'))).toBe(false)
    })

    it('should throw for missing script', async () => {
      await expect(
        handleScripts(
          'delete',
          {
            project_path: projectPath,
            script_path: 'ghost.gd',
          },
          config,
        ),
      ).rejects.toThrow('not found')
    })
  })

  // ==========================================
  // attach
  // ==========================================
  describe('attach', () => {
    it('should attach script to root node', async () => {
      createTmpScene(projectPath, 'game.tscn', MINIMAL_TSCN)
      createTmpScript(projectPath, 'game.gd')

      const result = await handleScripts(
        'attach',
        {
          project_path: projectPath,
          scene_path: 'game.tscn',
          script_path: 'game.gd',
        },
        config,
      )

      expect(result.content[0].text).toContain('Attached script')
      const content = readFileSync(join(projectPath, 'game.tscn'), 'utf-8')
      expect(content).toContain('script = ExtResource')
      expect(content).toContain('res://game.gd')
    })

    it('should attach script to specific named node', async () => {
      const scene = `[gd_scene format=3]\n\n[node name="Root" type="Node2D"]\n\n[node name="Player" type="CharacterBody2D" parent="."]\n`
      createTmpScene(projectPath, 'level.tscn', scene)
      createTmpScript(projectPath, 'player.gd')

      await handleScripts(
        'attach',
        {
          project_path: projectPath,
          scene_path: 'level.tscn',
          script_path: 'player.gd',
          node_name: 'Player',
        },
        config,
      )

      const content = readFileSync(join(projectPath, 'level.tscn'), 'utf-8')
      expect(content).toContain('res://player.gd')
    })

    it('should throw if node_name not found in scene', async () => {
      createTmpScene(projectPath, 'test.tscn', MINIMAL_TSCN)
      createTmpScript(projectPath, 'test.gd')

      await expect(
        handleScripts(
          'attach',
          {
            project_path: projectPath,
            scene_path: 'test.tscn',
            script_path: 'test.gd',
            node_name: 'NonExistent',
          },
          config,
        ),
      ).rejects.toThrow('not found')
    })

    it('should throw if scene not found', async () => {
      await expect(
        handleScripts(
          'attach',
          {
            project_path: projectPath,
            scene_path: 'ghost.tscn',
            script_path: 'test.gd',
          },
          config,
        ),
      ).rejects.toThrow('Scene not found')
    })

    it('should throw if both scene_path and script_path missing', async () => {
      await expect(handleScripts('attach', { project_path: projectPath }, config)).rejects.toThrow('required')
    })
  })

  // ==========================================
  // invalid action
  // ==========================================
  it('should throw for unknown action', async () => {
    await expect(handleScripts('invalid', {}, config)).rejects.toThrow('Unknown action')
  })
})
