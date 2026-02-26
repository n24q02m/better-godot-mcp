/**
 * Tests for project.godot settings parser and manipulation
 */

import { describe, expect, it } from 'vitest'
import {
  getInputActions,
  getSetting,
  parseProjectSettingsContent,
  removeSettingInContent,
  setSettingInContent,
} from '../../src/tools/helpers/project-settings.js'
import { SAMPLE_PROJECT_GODOT } from '../fixtures.js'

const MULTILINE_PROJECT = `; Engine configuration file.

[input]

jump={
"deadzone": 0.5,
"events": [Object(InputEventKey,"keycode":32)]
}
move_left={ "deadzone": 0.5, "events": [] }
`

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

    it('should parse multi-line input action', () => {
      const settings = parseProjectSettingsContent(MULTILINE_PROJECT)
      const input = settings.sections.get('input')

      expect(input?.has('jump')).toBe(true)
      const jumpValue = input?.get('jump')
      expect(jumpValue).toContain('"deadzone": 0.5')
      expect(jumpValue).toContain('InputEventKey')
      // It should capture the full value including newlines
      expect(jumpValue).toContain('\n')
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

    it('should replace multi-line input action', () => {
      const newValue = '{ "deadzone": 0.2, "events": [] }'
      const updated = setSettingInContent(MULTILINE_PROJECT, 'input/jump', newValue)

      expect(updated).toContain(`jump=${newValue}`)
      // Should remove the old multi-line value
      expect(updated).not.toContain('InputEventKey')
      // Should preserve other keys
      expect(updated).toContain('move_left={ "deadzone": 0.5, "events": [] }')
    })
  })

  // ==========================================
  // removeSettingInContent
  // ==========================================
  describe('removeSettingInContent', () => {
    it('should remove existing setting', () => {
      const result = removeSettingInContent(SAMPLE_PROJECT_GODOT, 'display/window/size/viewport_width')
      expect(result).not.toContain('window/size/viewport_width')
      // Should keep other settings
      expect(result).toContain('window/size/viewport_height')
    })

    it('should remove multi-line setting', () => {
      const result = removeSettingInContent(MULTILINE_PROJECT, 'input/jump')
      expect(result).not.toContain('jump={')
      expect(result).not.toContain('InputEventKey')
      // Should keep other settings
      expect(result).toContain('move_left')
    })

    it('should do nothing if setting not found', () => {
      const result = removeSettingInContent(SAMPLE_PROJECT_GODOT, 'input/nonexistent')
      expect(result).toBe(SAMPLE_PROJECT_GODOT)
    })

    it('should do nothing if section not found', () => {
      const result = removeSettingInContent(SAMPLE_PROJECT_GODOT, 'nonexistent/key')
      expect(result).toBe(SAMPLE_PROJECT_GODOT)
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

  describe('setSettingInContent extra', () => {
    it('should add key to middle section', () => {
      // display is between application and input
      const result = setSettingInContent(SAMPLE_PROJECT_GODOT, 'display/window/vsync/vsync_mode', '1')
      expect(result).toContain('window/vsync/vsync_mode=1')
      // Ensure it's in the right place (after [display] and before [input])
      const displayIdx = result.indexOf('[display]')
      const inputIdx = result.indexOf('[input]')
      const keyIdx = result.indexOf('window/vsync/vsync_mode=1')
      expect(keyIdx).toBeGreaterThan(displayIdx)
      expect(keyIdx).toBeLessThan(inputIdx)
    })
  })
