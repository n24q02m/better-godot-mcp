import { mkdirSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { GodotConfig } from '../../src/godot/types.js'
import { handleTilemap } from '../../src/tools/composite/tilemap.js'

describe('TileMap Injection Security Tests', () => {
  const projectPath = join(process.cwd(), 'tmp_security_tilemap_injection_test')
  const config: GodotConfig = { projectPath }

  beforeEach(() => {
    mkdirSync(projectPath, { recursive: true })
    writeFileSync(join(projectPath, 'project.godot'), '[config]')
  })

  afterEach(() => {
    rmSync(projectPath, { recursive: true, force: true })
  })

  it('should reject newlines and quotes in add_source texture_path', async () => {
    // Setup valid tileset
    await handleTilemap('create_tileset', { tileset_path: 'tileset.tres' }, config)

    // Attempt injection
    await expect(
      handleTilemap('add_source', { tileset_path: 'tileset.tres', texture_path: 'icon.png"\n[sub_resource]' }, config),
    ).rejects.toThrow('Invalid arguments: newlines not allowed')
  })
})
