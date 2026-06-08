/**
 * TileMap tool - TileSet and TileMap management
 * Actions: create_tileset | add_source | set_tile | paint | list
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { GodotConfig } from '../../godot/types.js'
import { formatJSON, formatSuccess, GodotMCPError, throwUnknownAction } from '../helpers/errors.js'
import { resolveProjectRoot, safeResolve } from '../helpers/paths.js'

export async function handleTilemap(action: string, args: Record<string, unknown>, config: GodotConfig) {
  const projectPath = resolveProjectRoot(args.project_path, config.projectPath)

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

      const fullPath = safeResolve(projectPath, tilesetPath)

      const content = [
        `[gd_resource type="TileSet" format=3]`,
        '',
        `[resource]`,
        `tile_shape = 0`,
        `tile_size = Vector2i(${tileSize}, ${tileSize})`,
        '',
      ].join('\n')

      await mkdir(dirname(fullPath), { recursive: true })
      try {
        await writeFile(fullPath, content, { encoding: 'utf-8', flag: 'wx' })
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === 'EEXIST') {
          throw new GodotMCPError(`TileSet already exists: ${tilesetPath}`, 'TILEMAP_ERROR', 'Use a different path.')
        }
        throw err
      }
      return formatSuccess(`Created TileSet: ${tilesetPath} (tile size: ${tileSize}x${tileSize})`)
    }

    case 'add_source': {
      const tilesetPath = args.tileset_path as string
      const texturePath = args.texture_path as string
      if (!tilesetPath || !texturePath) {
        throw new GodotMCPError('tileset_path and texture_path required', 'INVALID_ARGS', 'Both are required.')
      }

      if (texturePath.includes('\n') || texturePath.includes('\r') || texturePath.includes('"')) {
        throw new GodotMCPError(
          'Invalid texture path',
          'INVALID_ARGS',
          'Texture path must not contain newlines or double quotes.',
        )
      }

      const fullPath = safeResolve(projectPath, tilesetPath)

      let content: string
      try {
        content = await readFile(fullPath, 'utf-8')
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
          throw new GodotMCPError(`TileSet not found: ${tilesetPath}`, 'TILEMAP_ERROR', 'Create the tileset first.')
        }
        throw err
      }
      // ⚡ Bolt: Using replaceAll('\\', '/') avoids RegExp allocation overhead
      const resPath = `res://${texturePath.replaceAll('\\', '/')}`

      // Count existing sources to get next ID
      const sourceCount = (content.match(/\[ext_resource/g) || []).length
      const sourceId = `source_${sourceCount}`

      // Add ext_resource reference
      const extRes = `[ext_resource type="Texture2D" path="${resPath}" id="${sourceId}"]`
      content = content.replace('[resource]', () => `${extRes}\n\n[resource]`)

      await writeFile(fullPath, content, 'utf-8')
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

      const fullPath = safeResolve(projectPath, scenePath)

      let content: string
      try {
        content = await readFile(fullPath, 'utf-8')
      } catch (err) {
        if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
          throw new GodotMCPError(`Scene not found: ${scenePath}`, 'SCENE_ERROR', 'Check the file path.')
        }
        throw err
      }
      const tilemaps: string[] = []
      const tmRegex = /\[node name="([^"]+)" type="TileMapLayer"/g
      for (const match of content.matchAll(tmRegex)) {
        tilemaps.push(match[1])
      }

      return formatJSON({ scene: scenePath, tilemapLayers: tilemaps })
    }

    default:
      throwUnknownAction(action, ['create_tileset', 'add_source', 'set_tile', 'paint', 'list'])
  }
}
