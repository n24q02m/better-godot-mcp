import { describe, expect, it } from 'vitest'
import { handleProject } from '../../src/tools/composite/project.js'
import { createTmpProject, makeConfig } from '../fixtures.js'

describe('project tool', () => {
  it('should get project info', async () => {
    const { projectPath, cleanup } = createTmpProject()
    try {
      const config = makeConfig({ projectPath })
      const result = await handleProject('info', { project_path: projectPath }, config)
      const info = JSON.parse(result.content[0].text)
      expect(info.name).toBe('TestProject')
    } finally {
      cleanup()
    }
  })

  it('should get setting', async () => {
    const { projectPath, cleanup } = createTmpProject()
    try {
      const config = makeConfig({ projectPath })
      const result = await handleProject(
        'settings_get',
        { project_path: projectPath, key: 'application/config/name' },
        config,
      )
      const data = JSON.parse(result.content[0].text)
      expect(data.value).toBe('"TestProject"')
    } finally {
      cleanup()
    }
  })

  it('should set setting', async () => {
    const { projectPath, cleanup } = createTmpProject()
    try {
      const config = makeConfig({ projectPath })
      await handleProject(
        'settings_set',
        { project_path: projectPath, key: 'application/config/name', value: '"NewName"' },
        config,
      )

      const result = await handleProject(
        'settings_get',
        { project_path: projectPath, key: 'application/config/name' },
        config,
      )
      const data = JSON.parse(result.content[0].text)
      expect(data.value).toBe('"NewName"')
    } finally {
      cleanup()
    }
  })
})
