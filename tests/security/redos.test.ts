import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { GodotConfig } from '../../src/godot/types.js'
import { handleInputMap } from '../../src/tools/composite/input-map.js'
import { createTmpProject, makeConfig } from '../fixtures.js'

describe('ReDoS Security', () => {
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

  it('should handle extremely long action names without ReDoS in remove_action', async () => {
    const longActionName = 'a'.repeat(50000)
    const content = `[input]\n${longActionName}={\n"deadzone": 0.5,\n"events": []\n}\n`
    writeFileSync(join(projectPath, 'project.godot'), content)

    const startTime = Date.now()
    await handleInputMap(
      'remove_action',
      {
        project_path: projectPath,
        action_name: longActionName,
      },
      config,
    )
    const duration = Date.now() - startTime

    expect(duration).toBeLessThan(1000) // Should be very fast
    const updatedContent = readFileSync(join(projectPath, 'project.godot'), 'utf-8')
    expect(updatedContent).not.toContain(longActionName)
  })

  it('should handle extremely long events list without ReDoS in add_event', async () => {
    const longEvents = `${'InputEventKey(...),'.repeat(10000)}InputEventKey(...)`
    const content = `[input]\njump={\n"deadzone": 0.5,\n"events": [${longEvents}]\n}\n`
    writeFileSync(join(projectPath, 'project.godot'), content)

    const startTime = Date.now()
    await handleInputMap(
      'add_event',
      {
        project_path: projectPath,
        action_name: 'jump',
        event_type: 'key',
        event_value: 'KEY_SPACE',
      },
      config,
    )
    const duration = Date.now() - startTime

    expect(duration).toBeLessThan(2000) // 10k events might take a bit but should not hang
    const updatedContent = readFileSync(join(projectPath, 'project.godot'), 'utf-8')
    expect(updatedContent).toContain('physical_keycode":32')
  })

  it('should not be vulnerable to crafted regex-like action names', async () => {
    const craftedName = '.*.*.*.*.*.*.*.*.*'
    // Since we now have validation for action names, we should check if it rejects it or handles it safely
    // handleInputMap has: if (!/^[a-zA-Z0-9_-]+$/.test(actionName))

    await expect(
      handleInputMap(
        'remove_action',
        {
          project_path: projectPath,
          action_name: craftedName,
        },
        config,
      ),
    ).rejects.toThrow('Invalid action name')
  })
})
