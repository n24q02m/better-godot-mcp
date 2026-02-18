/**
 * Integration tests for Resources tool
 */

import { existsSync, mkdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { GodotConfig } from '../../src/godot/types.js'
import { handleResources } from '../../src/tools/composite/resources.js'
import { createTmpProject, makeConfig } from '../fixtures.js'

describe('resources', () => {
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

  const createResourceFile = (subPath: string, content = '') => {
    const fullPath = join(projectPath, subPath)
    const dir = fullPath.replace(/[/\\][^/\\]*$/, '')
    mkdirSync(dir, { recursive: true })
    writeFileSync(fullPath, content, 'utf-8')
    return fullPath
  }

  // ==========================================
  // list
  // ==========================================
  describe('list', () => {
    it('should list all resource files', async () => {
      createResourceFile('icon.png', 'dummy')
      createResourceFile('music/theme.ogg', 'dummy')
      createResourceFile('materials/mat.tres', '[gd_resource type="Material"]')

      const result = await handleResources(
        'list',
        {
          project_path: projectPath,
        },
        config,
      )

      const data = JSON.parse(result.content[0].text)
      // project.godot itself doesn't count as a resource
      expect(data.count).toBeGreaterThanOrEqual(3)
    })

    it('should filter by type', async () => {
      createResourceFile('icon.png', 'dummy')
      createResourceFile('music/theme.ogg', 'dummy')

      const result = await handleResources(
        'list',
        {
          project_path: projectPath,
          type: 'audio',
        },
        config,
      )

      const data = JSON.parse(result.content[0].text)
      expect(data.resources.every((r: { ext: string }) => ['.wav', '.ogg', '.mp3'].includes(r.ext))).toBe(true)
    })
  })

  // ==========================================
  // info
  // ==========================================
  describe('info', () => {
    it('should return resource info for .tres file', async () => {
      createResourceFile('materials/test.tres', '[gd_resource]\ntype="StandardMaterial3D"\npath="res://test"\n')

      const result = await handleResources(
        'info',
        {
          project_path: projectPath,
          resource_path: 'materials/test.tres',
        },
        config,
      )

      const data = JSON.parse(result.content[0].text)
      expect(data.extension).toBe('.tres')
      expect(data.size).toBeGreaterThan(0)
    })

    it('should throw for missing resource', async () => {
      await expect(
        handleResources(
          'info',
          {
            project_path: projectPath,
            resource_path: 'ghost.tres',
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
    it('should delete resource and .import file', async () => {
      const resPath = createResourceFile('icon.png', 'dummy')
      writeFileSync(`${resPath}.import`, '[remap]\npath="res://.godot/imported/icon.png"', 'utf-8')

      const result = await handleResources(
        'delete',
        {
          project_path: projectPath,
          resource_path: 'icon.png',
        },
        config,
      )

      expect(result.content[0].text).toContain('Deleted')
      expect(existsSync(resPath)).toBe(false)
      expect(existsSync(`${resPath}.import`)).toBe(false)
    })

    it('should throw for missing resource', async () => {
      await expect(
        handleResources(
          'delete',
          {
            project_path: projectPath,
            resource_path: 'ghost.png',
          },
          config,
        ),
      ).rejects.toThrow('not found')
    })
  })

  // ==========================================
  // import_config
  // ==========================================
  describe('import_config', () => {
    it('should read .import file content', async () => {
      createResourceFile('tex.png', 'dummy')
      writeFileSync(join(projectPath, 'tex.png.import'), '[remap]\npath="res://.godot/imported/tex.png"', 'utf-8')

      const result = await handleResources(
        'import_config',
        {
          project_path: projectPath,
          resource_path: 'tex.png',
        },
        config,
      )

      expect(result.content[0].text).toContain('[remap]')
    })

    it('should return not-imported info when no .import file', async () => {
      createResourceFile('font.ttf', 'dummy')

      const result = await handleResources(
        'import_config',
        {
          project_path: projectPath,
          resource_path: 'font.ttf',
        },
        config,
      )

      const data = JSON.parse(result.content[0].text)
      expect(data.imported).toBe(false)
    })
  })

  it('should throw for unknown action', async () => {
    await expect(handleResources('invalid', {}, config)).rejects.toThrow('Unknown action')
  })
})
