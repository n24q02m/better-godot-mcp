/**
 * TileMap tool - TileSet and TileMap management
 * Actions: create_tileset | add_source | set_tile | paint | list
 */

import { mkdir, readFile, writeFile } from 'node:fs/promises'
import { dirname } from 'node:path'
import type { GodotConfig } from '../../godot/types.js'
import { formatJSON, formatSuccess, GodotMCPError, throwUnknownAction } from '../helpers/errors.js'
import { pathExists, resolveProjectRoot, safeResolve } from '../helpers/paths.js'
import { countSubstring } from '../helpers/strings.js'

/** Tool result type used by MCP handlers */
type ToolResult = { content: Array<{ type: string; text: string }>; isError?: boolean }

async function handleCreateTileset(projectPath: string, args: Record<string, unknown>): Promise<ToolResult> {
  const tilesetPath = args.tileset_path as string
  if (!tilesetPath)
    throw new GodotMCPError(
      'No tileset_path specified',
      'INVALID_ARGS',
      'Provide tileset_path (e.g., "tilesets/main.tres").',
    )
  const tileSize = (args.tile_size as number) || 16

  const fullPath = safeResolve(projectPath, tilesetPath)

  if (await pathExists(fullPath)) {
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

  await mkdir(dirname(fullPath), { recursive: true })
  await writeFile(fullPath, content, 'utf-8')
  return formatSuccess(`Created TileSet: ${tilesetPath} (tile size: ${tileSize}x${tileSize})`)
}

async function handleAddSource(projectPath: string, args: Record<string, unknown>): Promise<ToolResult> {
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

  if (!(await pathExists(fullPath)))
    throw new GodotMCPError(`TileSet not found: ${tilesetPath}`, 'TILEMAP_ERROR', 'Create the tileset first.')

  let content = await readFile(fullPath, 'utf-8')
  const resPath = `res://${texturePath.replaceAll('\\', '/')}`

  const sourceCount = countSubstring(content, '[ext_resource')
  const sourceId = `source_${sourceCount}`

  const extRes = `[ext_resource type="Texture2D" path="${resPath}" id="${sourceId}"]`
  content = content.replace('[resource]', () => `${extRes}\n\n[resource]`)

  await writeFile(fullPath, content, 'utf-8')
  return formatSuccess(`Added texture source: ${texturePath} (id: ${sourceId})`)
}

async function handleSetTile(): Promise<ToolResult> {
  return formatSuccess(
    'Tile configuration requires editing TileSet .tres resource data.\n' +
      'For complex tile setup, use Godot editor.\n' +
      'Basic format: sources/N/tiles/coords/terrain_set, animation_columns, etc.',
  )
}

async function handlePaint(_projectPath: string, args: Record<string, unknown>): Promise<ToolResult> {
  const scenePath = args.scene_path as string
  if (!scenePath)
    throw new GodotMCPError('No scene_path specified', 'INVALID_ARGS', 'Provide scene_path with TileMapLayer node.')

  return formatSuccess(
    'TileMap painting requires modifying tile_map_data which is binary-encoded.\n' +
      'For procedural tile placement, create a GDScript that sets cells at runtime:\n' +
      '```gdscript\nvar tilemap = $TileMapLayer\ntilemap.set_cell(Vector2i(x, y), source_id, atlas_coords)\n```',
  )
}

async function handleList(projectPath: string, args: Record<string, unknown>): Promise<ToolResult> {
  const scenePath = args.scene_path as string
  if (!scenePath) throw new GodotMCPError('No scene_path specified', 'INVALID_ARGS', 'Provide scene_path.')

  const fullPath = safeResolve(projectPath, scenePath)

  if (!(await pathExists(fullPath)))
    throw new GodotMCPError(`Scene not found: ${scenePath}`, 'SCENE_ERROR', 'Check the file path.')

  const content = await readFile(fullPath, 'utf-8')
  const tilemaps: string[] = []
  const tmSearch = '[node name="'
  const tmType = '" type="TileMapLayer"'
  let pos = 0
  while (true) {
    pos = content.indexOf(tmSearch, pos)
    if (pos === -1) break
    const nameStart = pos + tmSearch.length
    const nameEnd = content.indexOf('"', nameStart)
    if (nameEnd === -1) {
      pos = nameStart
      continue
    }
    if (content.startsWith(tmType, nameEnd)) {
      tilemaps.push(content.slice(nameStart, nameEnd))
      pos = nameEnd + tmType.length
    } else {
      pos = nameEnd
    }
  }

  return formatJSON({ scene: scenePath, tilemapLayers: tilemaps })
}

const TILEMAP_ACTIONS: Record<string, (projectPath: string, args: Record<string, unknown>) => Promise<ToolResult>> = {
  create_tileset: handleCreateTileset,
  add_source: handleAddSource,
  set_tile: (_projectPath, _args) => handleSetTile(),
  paint: handlePaint,
  list: handleList,
}

export async function handleTilemap(action: string, args: Record<string, unknown>, config: GodotConfig) {
  const projectPath = resolveProjectRoot(args.project_path, config.projectPath)

  const handler = TILEMAP_ACTIONS[action]
  if (handler) {
    return handler(projectPath, args)
  }

  throwUnknownAction(action, Object.keys(TILEMAP_ACTIONS))
}
