import * as fs from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { parseProjectSettings, writeProjectSettings } from '../../src/tools/helpers/project-settings.js'

vi.mock('node:fs', () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}))

describe('project-settings-sync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // ==========================================
  // parseProjectSettings
  // ==========================================
  describe('parseProjectSettings', () => {
    it('should parse project settings synchronously', () => {
      const mockContent = '[application]\nconfig/name="Test"'
      vi.mocked(fs.readFileSync).mockReturnValue(mockContent)

      const settings = parseProjectSettings('project.godot')

      expect(fs.readFileSync).toHaveBeenCalledWith('project.godot', 'utf-8')
      expect(settings.sections.get('application')?.get('config/name')).toBe('"Test"')
    })

    it('should propagate readFileSync errors', () => {
      const error = new Error('File not found')
      vi.mocked(fs.readFileSync).mockImplementation(() => {
        throw error
      })

      expect(() => parseProjectSettings('missing.godot')).toThrow('File not found')
    })
  })

  // ==========================================
  // writeProjectSettings
  // ==========================================
  describe('writeProjectSettings', () => {
    it('should write project settings synchronously', () => {
      const mockContent = 'some content'
      vi.mocked(fs.writeFileSync).mockReturnValue(undefined)

      writeProjectSettings('project.godot', mockContent)

      expect(fs.writeFileSync).toHaveBeenCalledWith('project.godot', mockContent, 'utf-8')
    })

    it('should propagate writeFileSync errors', () => {
      const error = new Error('Permission denied')
      vi.mocked(fs.writeFileSync).mockImplementation(() => {
        throw error
      })

      expect(() => writeProjectSettings('readonly.godot', 'content')).toThrow('Permission denied')
    })
  })
})
