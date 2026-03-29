/**
 * Additional coverage tests for helper modules
 */

import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { parseProjectSettingsContent, setSettingInContent } from '../../src/tools/helpers/project-settings.js'
import { parseSceneContent, setNodePropertyInContent, writeScene } from '../../src/tools/helpers/scene-parser.js'

describe('project-settings additional coverage', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'ps-test-'))
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  describe('setSettingInContent', () => {
    it('should add key at end of last section when key not found', () => {
      const content = `[application]\nconfig/name="Test"\n`
      const result = setSettingInContent(content, 'application/config/version', '"1.0"')
      expect(result).toContain('config/version="1.0"')
    })

    it('should add new section when section does not exist', () => {
      const content = `[application]\nconfig/name="Test"\n`
      const result = setSettingInContent(content, 'rendering/renderer', '"vulkan"')
      expect(result).toContain('[rendering]')
      expect(result).toContain('renderer="vulkan"')
    })

    it('should replace existing key in section', () => {
      const content = `[application]\nconfig/name="Old"\n`
      const result = setSettingInContent(content, 'application/config/name', '"New"')
      expect(result).toContain('config/name="New"')
      expect(result).not.toContain('"Old"')
    })

    it('should handle key at end of section when section is last', () => {
      // The section is last in the file, key is not found - triggers lines 150-152
      const content = `[application]\nconfig/name="Test"\n`
      const result = setSettingInContent(content, 'application/new_key', '"value"')
      expect(result).toContain('new_key="value"')
    })

    it('should add key before leaving section when next section appears', () => {
      // Key is not found in section, next section header triggers add - triggers line 130-133
      const content = `[application]\nconfig/name="Test"\n\n[rendering]\nfoo=bar\n`
      const result = setSettingInContent(content, 'application/new_setting', '"val"')
      expect(result).toContain('new_setting="val"')
    })

    it('should return content unchanged when path has less than 2 parts', () => {
      const content = `[application]\nfoo=bar\n`
      const result = setSettingInContent(content, 'singlepart', '"val"')
      expect(result).toBe(content)
    })
  })

  describe('parseProjectSettingsContent edge cases', () => {
    it('should skip lines without equals sign', () => {
      const content = `[section]\nnoequalshere\nkey=value\n`
      const result = parseProjectSettingsContent(content)
      expect(result.sections.get('section')?.get('key')).toBe('value')
      expect(result.sections.get('section')?.size).toBe(1)
    })

    it('should handle content without trailing newline', () => {
      const content = `[section]\nkey=value`
      const result = parseProjectSettingsContent(content)
      expect(result.sections.get('section')?.get('key')).toBe('value')
    })
  })
})

describe('scene-parser additional coverage', () => {
  let tmpDir: string

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'sp-test-'))
  })

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true })
  })

  describe('parseSceneContent edge cases', () => {
    it('should handle content with only whitespace lines', () => {
      const content = `[gd_scene format=3]\n\n   \n\n[node name="Root" type="Node2D"]\n`
      const result = parseSceneContent(content)
      expect(result.nodes).toHaveLength(1)
    })

    it('should handle content with comment lines', () => {
      const content = `[gd_scene format=3]\n; This is a comment\n[node name="Root" type="Node2D"]\n`
      const result = parseSceneContent(content)
      expect(result.nodes).toHaveLength(1)
    })

    it('should handle sub_resource properties', () => {
      const content = `[gd_scene format=3]

[sub_resource type="RectangleShape2D" id="shape_1"]
size = Vector2(32, 32)
custom_prop = "test"

[node name="Root" type="Node2D"]
`
      const result = parseSceneContent(content)
      expect(result.subResources).toHaveLength(1)
      expect(result.subResources[0].properties.size).toBe('Vector2(32, 32)')
      expect(result.subResources[0].properties.custom_prop).toBe('"test"')
    })

    it('should handle sub_resource at end of file', () => {
      const content = `[gd_scene format=3]

[sub_resource type="CircleShape2D" id="circle_1"]
radius = 16.0`
      const result = parseSceneContent(content)
      expect(result.subResources).toHaveLength(1)
      expect(result.subResources[0].type).toBe('CircleShape2D')
    })

    it('should handle leading/trailing whitespace on lines', () => {
      const content = `  [gd_scene format=3]  \n  [node name="Root" type="Node2D"]  \n  visible = false  \n`
      const result = parseSceneContent(content)
      expect(result.nodes).toHaveLength(1)
      expect(result.nodes[0].properties.visible).toBe('false')
    })
  })

  describe('setNodePropertyInContent', () => {
    it('should return content unchanged when node not found', () => {
      const content = `[gd_scene format=3]\n[node name="Root" type="Node2D"]\n`
      const result = setNodePropertyInContent(content, 'Ghost', 'visible', 'false')
      expect(result).toBe(content)
    })

    it('should add property at end of file when node is last section', () => {
      const content = `[gd_scene format=3]\n[node name="Root" type="Node2D"]\n`
      const result = setNodePropertyInContent(content, 'Root', 'visible', 'false')
      expect(result).toContain('visible = false')
    })
  })

  describe('writeScene', () => {
    it('should write scene content to file', async () => {
      const filePath = join(tmpDir, 'test.tscn')
      await writeScene(filePath, '[gd_scene format=3]\n[node name="Root" type="Node2D"]\n')
      const { readFileSync } = require('node:fs') as typeof import('node:fs')
      expect(readFileSync(filePath, 'utf-8')).toContain('name="Root"')
    })
  })
})
