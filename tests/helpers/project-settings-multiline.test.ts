import { describe, expect, it } from 'vitest'
import {
  isValueComplete, // We will export this for testing
  parseProjectSettingsContent,
  setSettingInContent,
} from '../../src/tools/helpers/project-settings.js'

describe('project-settings multiline support', () => {
  describe('isValueComplete', () => {
    // We expect this function to be exported, even if just for testing.
    // If it's not exported, we can skip these unit tests and rely on integration tests.
    // But for TDD, it's better to export it.

    // Placeholder - will enable after implementation
    it('should identify complete values', () => {
      expect(isValueComplete('"hello"')).toBe(true)
      expect(isValueComplete('123')).toBe(true)
      expect(isValueComplete('[]')).toBe(true)
      expect(isValueComplete('{}')).toBe(true)
      expect(isValueComplete('{"a": 1}')).toBe(true)
      expect(isValueComplete('[1, 2]')).toBe(true)
    })

    it('should identify incomplete values', () => {
      expect(isValueComplete('"hello')).toBe(false)
      expect(isValueComplete('[')).toBe(false)
      expect(isValueComplete('{')).toBe(false)
      expect(isValueComplete('{"a":')).toBe(false)
      expect(isValueComplete('(')).toBe(false)
    })

    it('should handle nested structures', () => {
      expect(isValueComplete('{"a": [1, 2]}')).toBe(true)
      expect(isValueComplete('{"a": [1,')).toBe(false)
    })

    it('should ignore brackets in strings', () => {
      expect(isValueComplete('"["')).toBe(true)
      expect(isValueComplete('"{')).toBe(false) // Wait, "{ is incomplete string
      expect(isValueComplete('"{"')).toBe(true)
    })

    it('should handle escaped quotes', () => {
      expect(isValueComplete('"\\""')).toBe(true)
      expect(isValueComplete('"\\"')).toBe(false)
    })
  })

  describe('parseProjectSettingsContent', () => {
    it('should parse multiline array', () => {
      const content = `[application]
config/features=PackedStringArray("4.4",
"GL Compatibility")`

      const settings = parseProjectSettingsContent(content)
      const app = settings.sections.get('application')
      // Expect newline preservation or at least content capture
      expect(app?.get('config/features')).toContain('"4.4"')
      expect(app?.get('config/features')).toContain('"GL Compatibility"')
    })

    it('should parse multiline dictionary', () => {
      const content = `[input]
move_left={
"deadzone": 0.5,
"events": []
}`

      const settings = parseProjectSettingsContent(content)
      const input = settings.sections.get('input')
      const value = input?.get('move_left')
      expect(value).toContain('"deadzone": 0.5')
      expect(value).toContain('"events": []')
    })

    it('should parse deeply nested multiline structure', () => {
      const content = `[section]
key={
    "a": [
        1,
        2
    ],
    "b": {
        "c": 3
    }
}`
      const settings = parseProjectSettingsContent(content)
      const val = settings.sections.get('section')?.get('key')
      expect(val).toContain('"a": [')
      expect(val).toContain('1,')
      expect(val).toContain('2')
      expect(val).toContain('],')
      expect(val).toContain('"b": {')
      expect(val).toContain('"c": 3')
      expect(val).toContain('}')
    })
  })

  describe('setSettingInContent', () => {
    it('should replace single-line with multiline', () => {
      const content = `[section]
key=1
other=2`
      const newValue = `[
  1,
  2
]`
      const result = setSettingInContent(content, 'section/key', newValue)
      expect(result).toContain(`key=${newValue}`)
      expect(result).toContain('other=2')
    })

    it('should replace multiline with single-line', () => {
      const content = `[section]
key=[
  1,
  2
]
other=2`
      const result = setSettingInContent(content, 'section/key', '3')
      expect(result).toContain('key=3')
      expect(result).toContain('other=2')
      expect(result).not.toContain('[\n  1,\n  2\n]')
    })

    it('should replace multiline with multiline', () => {
      const content = `[section]
key=[
  1,
  2
]
other=2`
      const newValue = `{
  "a": 1
}`
      const result = setSettingInContent(content, 'section/key', newValue)
      expect(result).toContain(`key=${newValue}`)
      expect(result).toContain('other=2')
      expect(result).not.toContain('key=[')
    })
  })
})
