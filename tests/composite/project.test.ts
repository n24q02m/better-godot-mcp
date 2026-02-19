import { describe, expect, it } from 'vitest'
import { handleProject } from '../../src/tools/composite/project.js'
import { createTmpProject, makeConfig } from '../fixtures.js'

describe('project tool', () => {
  it('should return project info', async () => {
    const { projectPath, cleanup } = createTmpProject()
    const config = makeConfig({ projectPath })

    const result = await handleProject('info', { project_path: projectPath }, config)
    const info = JSON.parse(result.content[0].text)

    expect(info.name).toBe('TestProject')
    expect(info.mainScene).toBe('res://scenes/main.tscn')
    expect(info.features).toContain('4.4')
    expect(info.configVersion).toBe(5)

    cleanup()
  })

  it('should get project settings', async () => {
    const { projectPath, cleanup } = createTmpProject()
    const config = makeConfig({ projectPath })

    const result = await handleProject('settings_get', { project_path: projectPath, key: 'application/config/name' }, config)
    const data = JSON.parse(result.content[0].text)

    expect(data.key).toBe('application/config/name')
    expect(data.value).toBe('"TestProject"')

    cleanup()
  })

  it('should set project settings', async () => {
    const { projectPath, cleanup } = createTmpProject()
    const config = makeConfig({ projectPath })

    await handleProject('settings_set', { project_path: projectPath, key: 'application/config/custom_setting', value: '"MyValue"' }, config)

    const result = await handleProject('settings_get', { project_path: projectPath, key: 'application/config/custom_setting' }, config)
    const data = JSON.parse(result.content[0].text)

    expect(data.value).toBe('"MyValue"')

    cleanup()
  })
})
