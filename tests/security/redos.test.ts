import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import { handleInputMap } from '../../src/tools/composite/input-map.js'
import { createTmpProject, makeConfig } from '../fixtures.js'
import type { GodotConfig } from '../../src/godot/types.js'
import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

describe('Input Map ReDoS Security', () => {
  let projectPath: string
  let cleanup: () => void
  let config: GodotConfig

  beforeEach(() => {
    const tmp = createTmpProject()
    projectPath = tmp.projectPath
    cleanup = tmp.cleanup
    config = makeConfig({ projectPath })
  })

  afterEach(() => cleanup())

  it('should be resilient to long action names in remove_action', async () => {
    // This action name is designed to be long but valid according to the tool's validation
    const longActionName = 'a'.repeat(1000)

    // We expect it to throw 'not found' because it doesn't exist, but it should do so QUICKLY
    const start = Date.now()
    await expect(
      handleInputMap(
        'remove_action',
        {
          project_path: projectPath,
          action_name: longActionName,
        },
        config,
      )
    ).rejects.toThrow('not found')
    const duration = Date.now() - start

    // If it were vulnerable to ReDoS, this might take seconds or even hang.
    // 500ms is a very generous threshold for a "not found" check.
    expect(duration).toBeLessThan(500)
  })

  it('should be resilient to long action names in add_event', async () => {
    const longActionName = 'a'.repeat(1000)

    const start = Date.now()
    await expect(
      handleInputMap(
        'add_event',
        {
          project_path: projectPath,
          action_name: longActionName,
          event_type: 'key',
          event_value: 'KEY_SPACE',
        },
        config,
      )
    ).rejects.toThrow('not found')
    const duration = Date.now() - start

    expect(duration).toBeLessThan(500)
  })

  it('should handle large project.godot files efficiently', async () => {
    const configPath = join(projectPath, 'project.godot')
    let content = '[input]\n'
    for (let i = 0; i < 1000; i++) {
      content += `action_${i}={\n"deadzone": 0.5,\n"events": []\n}\n`
    }
    writeFileSync(configPath, content)

    const start = Date.now()
    await handleInputMap(
      'remove_action',
      {
        project_path: projectPath,
        action_name: 'action_500',
      },
      config,
    )
    const duration = Date.now() - start

    expect(duration).toBeLessThan(1000)
  })
})
