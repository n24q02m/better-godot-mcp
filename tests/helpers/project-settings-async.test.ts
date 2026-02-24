import * as fsPromises from 'node:fs/promises'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { parseProjectSettingsAsync, writeProjectSettingsAsync } from '../../src/tools/helpers/project-settings.js'

vi.mock('node:fs/promises')

describe('project-settings-async', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should parse project settings asynchronously', async () => {
    const mockContent = '[application]\nconfig/name="AsyncTest"\n'
    vi.mocked(fsPromises.readFile).mockResolvedValue(mockContent)

    const settings = await parseProjectSettingsAsync('project.godot')
    expect(fsPromises.readFile).toHaveBeenCalledWith('project.godot', 'utf-8')
    expect(settings.sections.get('application')?.get('config/name')).toBe('"AsyncTest"')
  })

  it('should write project settings asynchronously', async () => {
    const mockContent = '[application]\nconfig/name="AsyncTest"\n'
    vi.mocked(fsPromises.writeFile).mockResolvedValue(undefined)

    await writeProjectSettingsAsync('project.godot', mockContent)
    expect(fsPromises.writeFile).toHaveBeenCalledWith('project.godot', mockContent, 'utf-8')
  })
})
