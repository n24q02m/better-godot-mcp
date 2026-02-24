import { writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { handlePhysics } from '../../src/tools/composite/physics.js'
import { createTmpProject, makeConfig } from '../fixtures.js'

describe('physics tool', () => {
  it('should list physics layers', async () => {
    const { projectPath, cleanup } = createTmpProject()
    try {
      // Add physics layers to project.godot
      const configPath = join(projectPath, 'project.godot')
      // Note: parser expects key=value format
      const content = `[application]\n\n[layer_names]\n2d_physics/layer_1="Player"\n`
      writeFileSync(configPath, content, 'utf-8')

      const config = makeConfig({ projectPath })
      const result = await handlePhysics('layers', { project_path: projectPath }, config)
      const data = JSON.parse(result.content[0].text)
      // The key inside layer_names section is 2d_physics/layer_1
      expect(data.layers2d['2d_physics/layer_1']).toBe('Player')
    } finally {
      cleanup()
    }
  })

  it('should set layer name', async () => {
    const { projectPath, cleanup } = createTmpProject()
    try {
      const config = makeConfig({ projectPath })
      await handlePhysics(
        'set_layer_name',
        {
          project_path: projectPath,
          layer_number: 1,
          dimension: '2d',
          name: 'Enemy',
        },
        config,
      )

      const result = await handlePhysics('layers', { project_path: projectPath }, config)
      const data = JSON.parse(result.content[0].text)
      expect(data.layers2d['2d_physics/layer_1']).toBe('Enemy')
    } finally {
      cleanup()
    }
  })
})
