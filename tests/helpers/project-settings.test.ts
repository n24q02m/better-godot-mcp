/**
 * Tests for project.godot settings parser and manipulation
 */

import { describe, expect, it } from 'vitest'
import {
  getInputActions,
  getSetting,
  parseProjectSettingsContent,
  setSettingInContent,
} from '../../src/tools/helpers/project-settings.js'
import { SAMPLE_PROJECT_GODOT } from '../fixtures.js'

describe('project-settings', () => {
  // ==========================================
  // parseProjectSettingsContent
  // ==========================================
  describe('parseProjectSettingsContent', () => {
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

    it('should parse global keys', () => {
      const content = `config_version=5
[application]
config/name="Test"`
      const settings = parseProjectSettingsContent(content)
      const global = settings.sections.get('')
      expect(global).toBeDefined()
      expect(global?.get('config_version')).toBe('5')
    })

    it('should skip comments', () => {
      const settings = parseProjectSettingsContent(SAMPLE_PROJECT_GODOT)
      // No section should be named starting with ";"
      for (const key of settings.sections.keys()) {
        if (key !== '') {
          // Ignore global section
          expect(key.startsWith(';')).toBe(false)
        }
      }
    })

    it('should handle empty content', () => {
      const settings = parseProjectSettingsContent('')
      expect(settings.sections.size).toBe(1) // Should contain empty global section
      expect(settings.sections.has('')).toBe(true)
    })

    it('should handle content with only comments', () => {
      const settings = parseProjectSettingsContent('; just a comment\n; another one\n')
      expect(settings.sections.size).toBe(1)
    })

    it('should preserve raw content', () => {
      const settings = parseProjectSettingsContent(SAMPLE_PROJECT_GODOT)
      expect(settings.raw).toBe(SAMPLE_PROJECT_GODOT)
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

    it('should get global setting', () => {
      const settings = parseProjectSettingsContent('config_version=5\n[application]')
      expect(getSetting(settings, 'config_version')).toBe('5')
    })

    it('should return undefined for missing section', () => {
      const settings = parseProjectSettingsContent(SAMPLE_PROJECT_GODOT)
      expect(getSetting(settings, 'nonexistent/key')).toBeUndefined()
    })

    it('should return undefined for missing key', () => {
      const settings = parseProjectSettingsContent(SAMPLE_PROJECT_GODOT)
      expect(getSetting(settings, 'application/nonexistent')).toBeUndefined()
    })

    it('should return undefined for single-segment path if not in global', () => {
      const settings = parseProjectSettingsContent(SAMPLE_PROJECT_GODOT)
      expect(getSetting(settings, 'application')).toBeUndefined()
    })
  })

  // ==========================================
  // setSettingInContent
  // ==========================================
  describe('setSettingInContent', () => {
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

    it('should set global key', () => {
      const content = `[application]
config/name="Test"`
      const result = setSettingInContent(content, 'config_version', '5')
      expect(result).toMatch(/^config_version=5/)
    })

    it('should replace global key', () => {
      const content = `config_version=4
[application]`
      const result = setSettingInContent(content, 'config_version', '5')
      expect(result).toContain('config_version=5')
      expect(result).not.toContain('config_version=4')
    })
  })

  // ==========================================
  // getInputActions
  // ==========================================
  describe('getInputActions', () => {
    it('should extract input actions', () => {
      const settings = parseProjectSettingsContent(SAMPLE_PROJECT_GODOT)
      const actions = getInputActions(settings)
      expect(actions.size).toBeGreaterThan(0)
    })

    it('should return empty map when no input section', () => {
      const settings = parseProjectSettingsContent('[application]\nconfig/name="Test"\n')
      const actions = getInputActions(settings)
      expect(actions.size).toBe(0)
    })
  })
})
