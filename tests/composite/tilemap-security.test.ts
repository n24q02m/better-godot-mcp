/**
 * Security tests for Tilemap tool - prevent .tres injection via add_source
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { GodotConfig } from '../../src/godot/types.js'
import { handleTilemap } from '../../src/tools/composite/tilemap.js'
import { createTmpProject, makeConfig } from '../fixtures.js'

describe('tilemap security', () => {
  let projectPath: string
  let cleanup: () => void
  let config: GodotConfig

  beforeEach(async () => {
    const tmp = createTmpProject()
    projectPath = tmp.projectPath
    cleanup = tmp.cleanup
    config = makeConfig({ projectPath })

    await handleTilemap('create_tileset', { project_path: projectPath, tileset_path: 'tilesets/main.tres' }, config)
  })

  afterEach(() => cleanup())

  describe('add_source - texture_path injection prevention', () => {
    it('rejects texture_path containing a newline', async () => {
      await expect(
        handleTilemap(
          'add_source',
          {
            project_path: projectPath,
            tileset_path: 'tilesets/main.tres',
            texture_path: 'sprites/grass.png"]\n[ext_resource type="Script" path="res://evil.gd" id="0',
          },
          config,
        ),
      ).rejects.toThrow('Invalid texture path')
    })

    it('rejects texture_path containing a carriage return', async () => {
      await expect(
        handleTilemap(
          'add_source',
          {
            project_path: projectPath,
            tileset_path: 'tilesets/main.tres',
            texture_path: 'sprites/grass.png\r[ext_resource]',
          },
          config,
        ),
      ).rejects.toThrow('Invalid texture path')
    })

    it('rejects texture_path containing double quotes', async () => {
      await expect(
        handleTilemap(
          'add_source',
          {
            project_path: projectPath,
            tileset_path: 'tilesets/main.tres',
            texture_path: 'sprites/grass.png" id="injected',
          },
          config,
        ),
      ).rejects.toThrow('Invalid texture path')
    })

    it('still adds clean texture path successfully', async () => {
      await handleTilemap(
        'add_source',
        {
          project_path: projectPath,
          tileset_path: 'tilesets/main.tres',
          texture_path: 'sprites/grass.png',
        },
        config,
      )

      const updated = readFileSync(join(projectPath, 'tilesets/main.tres'), 'utf-8')
      expect(updated).toContain('[ext_resource type="Texture2D" path="res://sprites/grass.png"')
      expect(updated.match(/\[ext_resource/g)?.length).toBe(1)
    })
  })
})
