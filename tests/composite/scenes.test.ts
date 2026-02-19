/**
 * Integration tests for Scenes tool
 */

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { GodotConfig } from '../../src/godot/types.js'
import { handleScenes } from '../../src/tools/composite/scenes.js'
import { COMPLEX_TSCN, createTmpProject, createTmpScene, makeConfig } from '../fixtures.js'

describe('scenes', () => {
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
    it('should create a minimal scene file', async () => {
      const result = await handleScenes(
        'create',
        {
          project_path: projectPath,
          scene_path: 'scenes/main.tscn',
        },
        config,
      )
      expect(result.content[0].text).toContain('Created scene')

      const filePath = join(projectPath, 'scenes/main.tscn')
      expect(existsSync(filePath)).toBe(true)
      const content = readFileSync(filePath, 'utf-8')
      expect(content).toContain('[gd_scene format=3]')
      expect(content).toContain('type="Node2D"')
    })

    it('should create scene with custom root_type and root_name', async () => {
      const result = await handleScenes(
        'create',
        {
          project_path: projectPath,
          scene_path: 'ui/menu.tscn',
          root_type: 'Control',
          root_name: 'MainMenu',
        },
        config,
      )
      expect(result.content[0].text).toContain('Created scene')

      const content = readFileSync(join(projectPath, 'ui/menu.tscn'), 'utf-8')
      expect(content).toContain('name="MainMenu"')
      expect(content).toContain('type="Control"')
    })

    it('should throw if scene already exists', async () => {
      createTmpScene(projectPath, 'existing.tscn')
      await expect(
        handleScenes(
          'create',
          {
            project_path: projectPath,
            scene_path: 'existing.tscn',
          },
          config,
        ),
      ).rejects.toThrow('already exists')
    })

    it('should throw if no project_path', async () => {
      await expect(
        handleScenes(
          'create',
          {
            scene_path: 'test.tscn',
          },
          makeConfig(),
        ),
      ).rejects.toThrow()
    })
  })

  // ==========================================
  // list
  // ==========================================
  describe('list', () => {
    it('should list scenes in project', async () => {
      createTmpScene(projectPath, 'a.tscn')
      createTmpScene(projectPath, 'b.tscn')
      createTmpScene(projectPath, 'nested/c.tscn')

      const result = await handleScenes(
        'list',
        {
          project_path: projectPath,
        },
        config,
      )

      const data = JSON.parse(result.content[0].text)
      expect(data.count).toBe(3)
      expect(data.scenes).toContain('a.tscn')
      expect(data.scenes).toContain('b.tscn')
      expect(data.scenes).toContain('nested/c.tscn')
    })

    it('should return empty list for project with no scenes', async () => {
      const result = await handleScenes(
        'list',
        {
          project_path: projectPath,
        },
        config,
      )

      const data = JSON.parse(result.content[0].text)
      expect(data.count).toBe(0)
      expect(data.scenes).toHaveLength(0)
    })
  })

  // ==========================================
  // info
  // ==========================================
  describe('info', () => {
    it('should return scene info', async () => {
      createTmpScene(projectPath, 'level.tscn', COMPLEX_TSCN)

      const result = await handleScenes(
        'info',
        {
          project_path: projectPath,
          scene_path: 'level.tscn',
        },
        config,
      )

      const data = JSON.parse(result.content[0].text)
      expect(data.rootNode).toBe('Player')
      expect(data.rootType).toBe('CharacterBody2D')
      expect(data.nodeCount).toBeGreaterThan(0)
    })

    it('should throw for missing scene', async () => {
      await expect(
        handleScenes(
          'info',
          {
            project_path: projectPath,
            scene_path: 'nonexistent.tscn',
          },
          config,
        ),
      ).rejects.toThrow('not found')
    })
  })

  // ==========================================
  // delete
  // ==========================================
  describe('delete', () => {
    it('should delete existing scene', async () => {
      createTmpScene(projectPath, 'to_delete.tscn')

      const result = await handleScenes(
        'delete',
        {
          project_path: projectPath,
          scene_path: 'to_delete.tscn',
        },
        config,
      )

      expect(result.content[0].text).toContain('Deleted')
      expect(existsSync(join(projectPath, 'to_delete.tscn'))).toBe(false)
    })

    it('should throw for missing scene', async () => {
      await expect(
        handleScenes(
          'delete',
          {
            project_path: projectPath,
            scene_path: 'ghost.tscn',
          },
          config,
        ),
      ).rejects.toThrow('not found')
    })
  })

  // ==========================================
  // duplicate
  // ==========================================
  describe('duplicate', () => {
    it('should duplicate scene file', async () => {
      createTmpScene(projectPath, 'original.tscn', COMPLEX_TSCN)

      const result = await handleScenes(
        'duplicate',
        {
          project_path: projectPath,
          scene_path: 'original.tscn',
          new_path: 'copy.tscn',
        },
        config,
      )

      expect(result.content[0].text).toContain('Duplicated')
      expect(existsSync(join(projectPath, 'copy.tscn'))).toBe(true)
      const copyContent = readFileSync(join(projectPath, 'copy.tscn'), 'utf-8')
      expect(copyContent).toContain('Player')
    })

    it('should throw when destination exists', async () => {
      createTmpScene(projectPath, 'src.tscn')
      createTmpScene(projectPath, 'dst.tscn')

      await expect(
        handleScenes(
          'duplicate',
          {
            project_path: projectPath,
            scene_path: 'src.tscn',
            new_path: 'dst.tscn',
          },
          config,
        ),
      ).rejects.toThrow('already exists')
    })
  })

  // ==========================================
  // set_main
  // ==========================================
  describe('set_main', () => {
    it('should update main_scene in project.godot', async () => {
      createTmpScene(projectPath, 'main.tscn')

      const result = await handleScenes(
        'set_main',
        {
          project_path: projectPath,
          scene_path: 'main.tscn',
        },
        config,
      )

      expect(result.content[0].text).toContain('Set main scene')
      const godotContent = readFileSync(join(projectPath, 'project.godot'), 'utf-8')
      expect(godotContent).toContain('res://main.tscn')
    })
  })

  // ==========================================
  // security
  // ==========================================
  describe('security', () => {
    it('should prevent path traversal outside project directory', async () => {
      await expect(
        handleScenes(
          'info',
          {
            project_path: projectPath,
            scene_path: '../outside.tscn',
          },
          config,
        ),
      ).rejects.toThrow('Path traversal detected')
    })

    it('should prevent path traversal in duplicate destination', async () => {
      createTmpScene(projectPath, 'safe.tscn')
      await expect(
        handleScenes(
          'duplicate',
          {
            project_path: projectPath,
            scene_path: 'safe.tscn',
            new_path: '../unsafe_copy.tscn',
          },
          config,
        ),
      ).rejects.toThrow('Path traversal detected')
    })
  })

  // ==========================================
  // invalid action
  // ==========================================
  it('should throw for unknown action', async () => {
    await expect(handleScenes('invalid', {}, config)).rejects.toThrow('Unknown action')
  })
})
