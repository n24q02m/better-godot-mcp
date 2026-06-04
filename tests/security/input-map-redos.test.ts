import { readFileSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { GodotConfig } from '../../src/godot/types.js'
import { handleInputMap } from '../../src/tools/composite/input-map.js'
import { createTmpProject, makeConfig } from '../fixtures.js'

describe('input-map-security', () => {
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

  it('should handle large input map without performance degradation (ReDoS protection)', async () => {
    const configPath = join(projectPath, 'project.godot')
    let content = readFileSync(configPath, 'utf-8')

    // Append 1000 dummy actions to simulate a large file
    let largeInput = '\n[input]\n'
    for (let i = 0; i < 1000; i++) {
      largeInput += `action_${i}={\n"deadzone": 0.5,\n"events": []\n}\n`
    }
    content += largeInput
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

    // Should be very fast (well under 1s even in a slow environment)
    expect(duration).toBeLessThan(1000)

    const updatedContent = readFileSync(configPath, 'utf-8')
    expect(updatedContent).not.toContain('action_500={')
    expect(updatedContent).toContain('action_499={')
    expect(updatedContent).toContain('action_501={')
  })

  it('should handle malformed input map (missing closing brace) gracefully', async () => {
    const configPath = join(projectPath, 'project.godot')
    let content = readFileSync(configPath, 'utf-8')

    // Add a malformed action
    content += '\n[input]\nmalformed_action={\n"deadzone": 0.5,\n"events": []\n' // No closing }
    content += 'next_action={\n"deadzone": 0.5,\n"events": []\n}\n'
    writeFileSync(configPath, content)

    // remove_action should still work for other actions
    await handleInputMap(
      'remove_action',
      {
        project_path: projectPath,
        action_name: 'next_action',
      },
      config,
    )

    const updatedContent = readFileSync(configPath, 'utf-8')
    expect(updatedContent).not.toContain('next_action={')
    expect(updatedContent).toContain('malformed_action={')
  })

  it('should handle action names that are substrings of others correctly', async () => {
    await handleInputMap('add_action', { project_path: projectPath, action_name: 'move_test' }, config)
    await handleInputMap('add_action', { project_path: projectPath, action_name: 'move_test_more' }, config)

    await handleInputMap('remove_action', { project_path: projectPath, action_name: 'move_test' }, config)

    const content = readFileSync(join(projectPath, 'project.godot'), 'utf-8')
    expect(content).not.toContain('move_test={')
    expect(content).toContain('move_test_more={')
  })

  it('should handle add_event on multi-line actions correctly without ReDoS', async () => {
    await handleInputMap('add_action', { project_path: projectPath, action_name: 'multi_line' }, config)

    await handleInputMap(
      'add_event',
      {
        project_path: projectPath,
        action_name: 'multi_line',
        event_type: 'key',
        event_value: 'KEY_SPACE',
      },
      config,
    )

    const content = readFileSync(join(projectPath, 'project.godot'), 'utf-8')
    expect(content).toContain('multi_line={')
    expect(content).toContain('InputEventKey')
    expect(content).toContain('"physical_keycode":32')
  })
})
