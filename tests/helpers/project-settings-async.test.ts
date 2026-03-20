import * as fsPromises from 'node:fs/promises'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { parseProjectSettingsAsync, writeProjectSettingsAsync } from '../../src/tools/helpers/project-settings.js'

vi.mock('node:fs/promises', () => ({
  readFile: vi.fn(),
  writeFile: vi.fn(),
}))

describe('project-settings async', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should parse project settings asynchronously', async () => {
    const mockContent = '[application]\nconfig/name="Test"'
    vi.mocked(fsPromises.readFile).mockResolvedValue(mockContent)

    const settings = await parseProjectSettingsAsync('project.godot')

    expect(fsPromises.readFile).toHaveBeenCalledWith('project.godot', 'utf-8')
    expect(settings.sections.get('application')?.get('config/name')).toBe('"Test"')
  })

  it('should write project settings asynchronously', async () => {
    const mockContent = 'some content'
    vi.mocked(fsPromises.writeFile).mockResolvedValue(undefined)

    await writeProjectSettingsAsync('project.godot', mockContent)

    expect(fsPromises.writeFile).toHaveBeenCalledWith('project.godot', mockContent, 'utf-8')
  })

  it('should propagate readFile errors', async () => {
    const error = new Error('File not found')
    vi.mocked(fsPromises.readFile).mockRejectedValue(error)

    await expect(parseProjectSettingsAsync('missing.godot')).rejects.toThrow('File not found')
  })

  it('should propagate writeFile errors', async () => {
    const error = new Error('Permission denied')
    vi.mocked(fsPromises.writeFile).mockRejectedValue(error)

    await expect(writeProjectSettingsAsync('readonly.godot', 'content')).rejects.toThrow('Permission denied')
  })
})
