/**
 * Tests for project.godot settings parser and manipulation
 */

import { mkdtemp, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  getSetting,
  parseProjectSettingsAsync,
  parseProjectSettingsContent,
  setSettingInContent,
} from '../../src/tools/helpers/project-settings.js'
import { SAMPLE_PROJECT_GODOT } from '../fixtures.js'

describe('project-settings', () => {
  let testDir: string

  beforeAll(async () => {
    testDir = await mkdtemp(join(tmpdir(), 'godot-mcp-settings-test-'))
  })

  afterAll(async () => {
    await rm(testDir, { recursive: true, force: true })
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ==========================================
  // parseProjectSettingsAsync
  // ==========================================
  describe('parseProjectSettingsAsync', () => {
    it('should parse project settings asynchronously', async () => {
      const filePath = join(testDir, 'project.godot')
      const content = '[application]\nconfig/name="AsyncTest"'
      await writeFile(filePath, content, 'utf-8')

      const settings = await parseProjectSettingsAsync(filePath)
      expect(settings.sections.get('application')?.get('config/name')).toBe('"AsyncTest"')
    })

    it('should propagate errors from readFile', async () => {
      await expect(parseProjectSettingsAsync(join(testDir, 'nonexistent.godot'))).rejects.toThrow()
    })
  })

  // ==========================================
  // parseProjectSettingsContent
  // ==========================================
  describe('parseProjectSettingsContent', () => {
    it('should handle duplicate sections', () => {
      const settings = parseProjectSettingsContent('[application]\nconfig/name="1"\n[application]\nconfig/icon="2"')
      expect(settings.sections.get('application')?.get('config/name')).toBe('"1"')
      expect(settings.sections.get('application')?.get('config/icon')).toBe('"2"')
    })

    it('should handle comment at end of file without newline', () => {
      const settings = parseProjectSettingsContent('; final comment')
      expect(settings.sections.size).toBe(0)
    })

    it('should parse sections', () => {
      const settings = parseProjectSettingsContent(SAMPLE_PROJECT_GODOT)
      expect(settings.sections.has('application')).toBe(true)
      expect(settings.sections.has('display')).toBe(true)
      expect(settings.sections.has('input')).toBe(true)
      expect(settings.sections.has('rendering')).toBe(true)
    })

    it('should parse key-value pairs', () => {
      const settings = parseProjectSettingsContent(SAMPLE_PROJECT_GODOT)
      const app = settings.sections.get('application')
      expect(app?.get('config/name')).toBe('"TestProject"')
      expect(app?.get('run/main_scene')).toBe('"res://scenes/main.tscn"')
    })

    it('should parse keys with slashes', () => {
      const settings = parseProjectSettingsContent(SAMPLE_PROJECT_GODOT)
      const display = settings.sections.get('display')
      expect(display?.get('window/size/viewport_width')).toBe('1280')
      expect(display?.get('window/size/viewport_height')).toBe('720')
    })

    it('should skip comments', () => {
      const settings = parseProjectSettingsContent(SAMPLE_PROJECT_GODOT)
      // No section should be named starting with ";"
      for (const key of settings.sections.keys()) {
        expect(key.startsWith(';')).toBe(false)
      }
    })

    it('should handle empty content', () => {
      const settings = parseProjectSettingsContent('')
      expect(settings.sections.size).toBe(0)
    })

    it('should handle content with only comments', () => {
      const settings = parseProjectSettingsContent('; just a comment\n; another one\n')
      expect(settings.sections.size).toBe(0)
    })

    it('should preserve raw content', () => {
      const settings = parseProjectSettingsContent(SAMPLE_PROJECT_GODOT)
      expect(settings.raw).toBe(SAMPLE_PROJECT_GODOT)
    })
    it('should ignore malformed section header (missing closing bracket)', () => {
      const settings = parseProjectSettingsContent('[application\nconfig/name="Test"\n')
      expect(settings.sections.has('application')).toBe(false)
    })

    it('should ignore malformed section header (missing opening bracket)', () => {
      const settings = parseProjectSettingsContent('application]\nconfig/name="Test"\n')
      expect(settings.sections.has('application')).toBe(false)
    })

    it('should ignore key-value pair without equals sign', () => {
      const settings = parseProjectSettingsContent('[application]\nconfig/name "Test"\n')
      const app = settings.sections.get('application')
      expect(app?.has('config/name')).toBe(false)
      expect(app?.size).toBe(0)
    })

    it('should ignore key-value pair before any section is declared', () => {
      const settings = parseProjectSettingsContent('config/name="Test"\n[application]\n')
      const app = settings.sections.get('application')
      expect(app?.has('config/name')).toBe(false)
    })
  })

  // ==========================================
  // getSetting
  // ==========================================
  describe('getSetting', () => {
    it('should get existing setting by section/key path', () => {
      const settings = parseProjectSettingsContent(SAMPLE_PROJECT_GODOT)
      expect(getSetting(settings, 'application/config/name')).toBe('"TestProject"')
    })

    it('should get nested key path', () => {
      const settings = parseProjectSettingsContent(SAMPLE_PROJECT_GODOT)
      expect(getSetting(settings, 'display/window/size/viewport_width')).toBe('1280')
    })

    it('should return undefined for missing section', () => {
      const settings = parseProjectSettingsContent(SAMPLE_PROJECT_GODOT)
      expect(getSetting(settings, 'nonexistent/key')).toBeUndefined()
    })

    it('should return undefined for missing key', () => {
      const settings = parseProjectSettingsContent(SAMPLE_PROJECT_GODOT)
      expect(getSetting(settings, 'application/nonexistent')).toBeUndefined()
    })

    it('should return undefined for single-segment path', () => {
      const settings = parseProjectSettingsContent(SAMPLE_PROJECT_GODOT)
      expect(getSetting(settings, 'application')).toBeUndefined()
    })
  })

  // ==========================================
  // setSettingInContent
  // ==========================================
  describe('setSettingInContent', () => {
    it('should add key to the last section', () => {
      const result = setSettingInContent(SAMPLE_PROJECT_GODOT, 'rendering/new_key', '123')
      expect(result).toContain('new_key=123')
      expect(result.endsWith('new_key=123')).toBe(true)
    })

    it('should replace existing value', () => {
      const result = setSettingInContent(SAMPLE_PROJECT_GODOT, 'display/window/size/viewport_width', '1920')
      expect(result).toContain('window/size/viewport_width=1920')
      expect(result).not.toContain('window/size/viewport_width=1280')
    })

    it('should add key to existing section', () => {
      const result = setSettingInContent(SAMPLE_PROJECT_GODOT, 'application/config/icon', '"res://icon.svg"')
      expect(result).toContain('config/icon="res://icon.svg"')
      // Section should still exist
      expect(result).toContain('[application]')
    })

    it('should create new section if not exists', () => {
      const result = setSettingInContent(SAMPLE_PROJECT_GODOT, 'physics/common/physics_fps', '120')
      expect(result).toContain('[physics]')
      expect(result).toContain('common/physics_fps=120')
    })

    it('should handle path with only 2 segments', () => {
      const result = setSettingInContent(SAMPLE_PROJECT_GODOT, 'application/custom_key', 'value')
      expect(result).toContain('custom_key=value')
    })

    it('should reject single-segment path (no-op)', () => {
      const original = SAMPLE_PROJECT_GODOT
      const result = setSettingInContent(original, 'noslash', 'value')
      expect(result).toBe(original)
    })

    it('should handle single-segment path (section_only)', () => {
      const result = setSettingInContent(SAMPLE_PROJECT_GODOT, 'section_only', 'value')
      expect(result).toBe(SAMPLE_PROJECT_GODOT)
    })

    it('should handle empty path', () => {
      const result = setSettingInContent(SAMPLE_PROJECT_GODOT, '', 'value')
      expect(result).toBe(SAMPLE_PROJECT_GODOT)
    })
  })
})
