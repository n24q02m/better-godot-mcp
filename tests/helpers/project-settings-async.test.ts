/**
 * Async tests for project.godot settings parser
 */

import { describe, expect, it } from 'vitest'
import { parseProjectSettings } from '../../src/tools/helpers/project-settings.js'
import { createTmpProject, SAMPLE_PROJECT_GODOT } from '../fixtures.js'
import { join } from 'node:path'

describe('project-settings async', () => {
  it('should parse project settings asynchronously', async () => {
    const { projectPath, cleanup } = createTmpProject(SAMPLE_PROJECT_GODOT)
    const configPath = join(projectPath, 'project.godot')

    try {
      const settings = await parseProjectSettings(configPath)

      expect(settings.sections.has('application')).toBe(true)
      expect(settings.sections.get('application')?.get('config/name')).toBe('"TestProject"')
      expect(settings.raw).toBe(SAMPLE_PROJECT_GODOT)
    } finally {
      cleanup()
    }
  })

  it('should fail if file does not exist', async () => {
    const { projectPath, cleanup } = createTmpProject()
    const configPath = join(projectPath, 'non_existent.godot')

    try {
      await expect(parseProjectSettings(configPath)).rejects.toThrow()
    } finally {
      cleanup()
    }
  })
})
