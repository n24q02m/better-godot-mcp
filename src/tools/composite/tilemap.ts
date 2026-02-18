/**
 * TileMap tool - TileSet and TileMap management
 * Actions: create_tileset | add_source | set_tile | paint | list
 */

import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import type { GodotConfig } from '../../godot/types.js'
import { formatJSON, formatSuccess, GodotMCPError } from '../helpers/errors.js'

export async function handleTilemap(action: string, args: Record<string, unknown>, config: GodotConfig) {
  const projectPath = (args.project_path as string) || config.projectPath

  switch (action) {
    case 'create_tileset': {
      const tilesetPath = args.tileset_path as string
      if (!tilesetPath)
        throw new GodotMCPError(
          'No tileset_path specified',
          'INVALID_ARGS',
          'Provide tileset_path (e.g., "tilesets/main.tres").',
        )
      const tileSize = (args.tile_size as number) || 16

      const fullPath = projectPath ? resolve(projectPath, tilesetPath) : resolve(tilesetPath)
      if (existsSync(fullPath)) {
        throw new GodotMCPError(`TileSet already exists: ${tilesetPath}`, 'TILEMAP_ERROR', 'Use a different path.')
      }

      const content = [
        `[gd_resource type="TileSet" format=3]`,
        '',
        `[resource]`,
        `tile_shape = 0`,
        `tile_size = Vector2i(${tileSize}, ${tileSize})`,
        '',
      ].join('\n')

      mkdirSync(dirname(fullPath), { recursive: true })
      writeFileSync(fullPath, content, 'utf-8')
      return formatSuccess(`Created TileSet: ${tilesetPath} (tile size: ${tileSize}x${tileSize})`)
    }

    case 'add_source': {
      const tilesetPath = args.tileset_path as string
      const texturePath = args.texture_path as string
      if (!tilesetPath || !texturePath) {
        throw new GodotMCPError('tileset_path and texture_path required', 'INVALID_ARGS', 'Both are required.')
      }

      const fullPath = projectPath ? resolve(projectPath, tilesetPath) : resolve(tilesetPath)
      if (!existsSync(fullPath))
        throw new GodotMCPError(`TileSet not found: ${tilesetPath}`, 'TILEMAP_ERROR', 'Create the tileset first.')

      let content = readFileSync(fullPath, 'utf-8')
      const resPath = `res://${texturePath.replace(/\\/g, '/')}`

      // Count existing sources to get next ID
      const sourceCount = (content.match(/\[ext_resource/g) || []).length
      const sourceId = `source_${sourceCount}`

      // Add ext_resource reference
      const extRes = `[ext_resource type="Texture2D" path="${resPath}" id="${sourceId}"]`
      content = content.replace('[resource]', `${extRes}\n\n[resource]`)

      writeFileSync(fullPath, content, 'utf-8')
      return formatSuccess(`Added texture source: ${texturePath} (id: ${sourceId})`)
    }

    case 'set_tile': {
      return formatSuccess(
        'Tile configuration requires editing TileSet .tres resource data.\n' +
          'For complex tile setup, use Godot editor.\n' +
          'Basic format: sources/N/tiles/coords/terrain_set, animation_columns, etc.',
      )
    }

    case 'paint': {
      const scenePath = args.scene_path as string
      if (!scenePath)
        throw new GodotMCPError('No scene_path specified', 'INVALID_ARGS', 'Provide scene_path with TileMapLayer node.')

      return formatSuccess(
        'TileMap painting requires modifying tile_map_data which is binary-encoded.\n' +
          'For procedural tile placement, create a GDScript that sets cells at runtime:\n' +
          '```gdscript\nvar tilemap = $TileMapLayer\ntilemap.set_cell(Vector2i(x, y), source_id, atlas_coords)\n```',
      )
    }

    case 'list': {
      const scenePath = args.scene_path as string
      if (!scenePath) throw new GodotMCPError('No scene_path specified', 'INVALID_ARGS', 'Provide scene_path.')

      const fullPath = projectPath ? resolve(projectPath, scenePath) : resolve(scenePath)
      if (!existsSync(fullPath))
        throw new GodotMCPError(`Scene not found: ${scenePath}`, 'SCENE_ERROR', 'Check the file path.')

      const content = readFileSync(fullPath, 'utf-8')
      const tilemaps: string[] = []
      const tmRegex = /\[node name="([^"]+)" type="TileMapLayer"/g
      for (const match of content.matchAll(tmRegex)) {
        tilemaps.push(match[1])
      }

      return formatJSON({ scene: scenePath, tilemapLayers: tilemaps })
    }

    default:
      throw new GodotMCPError(
        `Unknown action: ${action}`,
        'INVALID_ACTION',
        'Valid actions: create_tileset, add_source, set_tile, paint, list. Use help tool for full docs.',
      )
  }
}
