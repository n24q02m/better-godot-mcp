/**
 * Integration tests for TileMap tool
 */

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { GodotConfig } from '../../src/godot/types.js'
import { handleTilemap } from '../../src/tools/composite/tilemap.js'
import { createTmpProject, createTmpScene, makeConfig } from '../fixtures.js'

const TILEMAP_SCENE = `[gd_scene format=3]

[node name="Root" type="Node2D"]

[node name="TileMap" type="TileMapLayer" parent="."]

[node name="Background" type="TileMapLayer" parent="."]
`

describe('tilemap', () => {
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
  // create_tileset
  // ==========================================
  describe('create_tileset', () => {
    it('should create .tres file at given path', async () => {
      const result = await handleTilemap('create_tileset', { tileset_path: 'tilesets/main.tres' }, config)

      expect(result.content[0].text).toContain('Created TileSet')
      expect(existsSync(join(projectPath, 'tilesets/main.tres'))).toBe(true)
    })


    it('should create .tres file at given path without project_path', async () => {
      const result = await handleTilemap('create_tileset', { tileset_path: join(projectPath, 'tilesets/no_proj.tres') }, { projectPath: '' } as GodotConfig)

      expect(result.content[0].text).toContain('Created TileSet')
      expect(existsSync(join(projectPath, 'tilesets/no_proj.tres'))).toBe(true)
    })

    it('should use default tile_size of 16', async () => {
      await handleTilemap('create_tileset', { tileset_path: 'tilesets/tiles16.tres' }, config)

      const content = readFileSync(join(projectPath, 'tilesets/tiles16.tres'), 'utf-8')
      expect(content).toContain('Vector2i(16, 16)')
    })

    it('should use custom tile_size when provided', async () => {
      await handleTilemap('create_tileset', { tileset_path: 'tilesets/tiles32.tres', tile_size: 32 }, config)

      const content = readFileSync(join(projectPath, 'tilesets/tiles32.tres'), 'utf-8')
      expect(content).toContain('Vector2i(32, 32)')
    })

    it('should throw if tileset already exists', async () => {
      await handleTilemap('create_tileset', { tileset_path: 'tilesets/main.tres' }, config)

      await expect(handleTilemap('create_tileset', { tileset_path: 'tilesets/main.tres' }, config)).rejects.toThrow(
        'already exists',
      )
    })

    it('should throw if no tileset_path provided', async () => {
      await expect(handleTilemap('create_tileset', {}, config)).rejects.toThrow('No tileset_path specified')
    })
  })

  // ==========================================
  // add_source
  // ==========================================
  describe('add_source', () => {
    it('should add ext_resource with texture path to existing tileset', async () => {
      await handleTilemap('create_tileset', { tileset_path: 'tilesets/main.tres' }, config)

      const result = await handleTilemap(
        'add_source',
        { tileset_path: 'tilesets/main.tres', texture_path: 'textures/tiles.png' },
        config,
      )

      expect(result.content[0].text).toContain('Added texture source')
      const content = readFileSync(join(projectPath, 'tilesets/main.tres'), 'utf-8')
      expect(content).toContain('ext_resource')
      expect(content).toContain('tiles.png')
    })


    it('should increment source ID when adding multiple sources', async () => {
      await handleTilemap('create_tileset', { tileset_path: 'tilesets/main.tres' }, config)
      await handleTilemap('add_source', { tileset_path: 'tilesets/main.tres', texture_path: 'textures/tiles1.png' }, config)
      const result = await handleTilemap('add_source', { tileset_path: 'tilesets/main.tres', texture_path: 'textures/tiles2.png' }, config)

      expect(result.content[0].text).toContain('id: source_1')
      const content = readFileSync(join(projectPath, 'tilesets/main.tres'), 'utf-8')
      expect(content).toContain('id="source_0"')
      expect(content).toContain('id="source_1"')
    })

    it('should convert backslashes in texture_path to forward slashes', async () => {
      await handleTilemap('create_tileset', { tileset_path: 'tilesets/main.tres' }, config)
      await handleTilemap('add_source', { tileset_path: 'tilesets/main.tres', texture_path: 'textures\\win_tiles.png' }, config)

      const content = readFileSync(join(projectPath, 'tilesets/main.tres'), 'utf-8')
      expect(content).toContain('res://textures/win_tiles.png')
    })

    it('should throw if tileset not found', async () => {
      await expect(
        handleTilemap(
          'add_source',
          { tileset_path: 'tilesets/nonexistent.tres', texture_path: 'textures/tiles.png' },
          config,
        ),
      ).rejects.toThrow('TileSet not found')
    })

    it('should throw if texture_path is missing', async () => {
      await handleTilemap('create_tileset', { tileset_path: 'tilesets/main.tres' }, config)

      await expect(handleTilemap('add_source', { tileset_path: 'tilesets/main.tres' }, config)).rejects.toThrow(
        'tileset_path and texture_path required',
      )
    })
  })

  // ==========================================
  // set_tile
  // ==========================================
  describe('set_tile', () => {
    it('should return success message containing Tile configuration', async () => {
      const result = await handleTilemap('set_tile', {}, config)

      expect(result.content[0].text).toContain('Tile configuration')
    })
  })

  // ==========================================
  // paint
  // ==========================================
  describe('paint', () => {
    it('should return success message with scene_path provided', async () => {
      createTmpScene(projectPath, 'level.tscn', TILEMAP_SCENE)

      const result = await handleTilemap('paint', { scene_path: 'level.tscn' }, config)

      expect(result.content[0].text).toContain('TileMap painting')
    })

    it('should throw if no scene_path provided', async () => {
      await expect(handleTilemap('paint', {}, config)).rejects.toThrow('No scene_path specified')
    })
  })

  // ==========================================
  // list
  // ==========================================
  describe('list', () => {
    it('should list TileMapLayer nodes from scene', async () => {
      createTmpScene(projectPath, 'level.tscn', TILEMAP_SCENE)

      const result = await handleTilemap('list', { scene_path: 'level.tscn' }, config)

      const data = JSON.parse(result.content[0].text)
      expect(data.tilemapLayers).toContain('TileMap')
      expect(data.tilemapLayers).toContain('Background')
    })

    it('should return empty array for scene without TileMapLayer nodes', async () => {
      createTmpScene(projectPath, 'empty.tscn')

      const result = await handleTilemap('list', { scene_path: 'empty.tscn' }, config)

      const data = JSON.parse(result.content[0].text)
      expect(data.tilemapLayers).toHaveLength(0)
    })

    it('should throw if scene not found', async () => {
      await expect(handleTilemap('list', { scene_path: 'ghost.tscn' }, config)).rejects.toThrow('Scene not found')
    })

    it('should throw if no scene_path provided', async () => {
      await expect(handleTilemap('list', {}, config)).rejects.toThrow('No scene_path specified')
    })
  })

  // ==========================================
  // errors
  // ==========================================
  it('should throw for unknown action', async () => {
    await expect(handleTilemap('unknown', {}, config)).rejects.toThrow('Unknown action')
  })
})
