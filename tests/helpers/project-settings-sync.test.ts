import * as fs from 'node:fs'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { parseProjectSettings, writeProjectSettings } from '../../src/tools/helpers/project-settings.js'

vi.mock('node:fs', () => ({
  readFileSync: vi.fn(),
  writeFileSync: vi.fn(),
}))

describe('project-settings sync', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should parse project settings synchronously', () => {
    const mockContent = '[application]\nconfig/name="Test"'
    vi.mocked(fs.readFileSync).mockReturnValue(mockContent)

    const settings = parseProjectSettings('project.godot')

    expect(fs.readFileSync).toHaveBeenCalledWith('project.godot', 'utf-8')
    expect(settings.sections.get('application')?.get('config/name')).toBe('"Test"')
  })

  it('should write project settings synchronously', () => {
    const mockContent = 'some content'
    vi.mocked(fs.writeFileSync).mockReturnValue(undefined)

    writeProjectSettings('project.godot', mockContent)

    expect(fs.writeFileSync).toHaveBeenCalledWith('project.godot', mockContent, 'utf-8')
  })
})
