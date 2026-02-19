/**
 * Integration tests for Scripts tool
 */

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { GodotConfig } from '../../src/godot/types.js'
import { handleScripts } from '../../src/tools/composite/scripts.js'
import { createTmpProject, createTmpScript, makeConfig } from '../fixtures.js'

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
  // security
  // ==========================================
  describe('security', () => {
    it('should prevent writing script outside project', async () => {
      await expect(
        handleScripts(
          'write',
          {
            project_path: projectPath,
            script_path: '../outside.gd',
            content: 'extends Node',
          },
          config,
        ),
      ).rejects.toThrow(/Path traversal detected/)
    })

    it('should prevent reading script outside project', async () => {
      await expect(
        handleScripts(
          'read',
          {
            project_path: projectPath,
            script_path: '../outside.gd',
          },
          config,
        ),
      ).rejects.toThrow(/Path traversal detected/)
    })

    it('should prevent creating script outside project', async () => {
      await expect(
        handleScripts(
          'create',
          {
            project_path: projectPath,
            script_path: '../outside.gd',
          },
          config,
        ),
      ).rejects.toThrow(/Path traversal detected/)
    })

    it('should prevent deleting script outside project', async () => {
      await expect(
        handleScripts(
          'delete',
          {
            project_path: projectPath,
            script_path: '../outside.gd',
          },
          config,
        ),
      ).rejects.toThrow(/Path traversal detected/)
    })
  })

  // ==========================================
  // invalid action
  // ==========================================
  it('should throw for unknown action', async () => {
    await expect(handleScripts('invalid', {}, config)).rejects.toThrow('Unknown action')
  })
})
