/**
 * Integration tests for Input Map tool
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { GodotConfig } from '../../src/godot/types.js'
import { handleInputMap } from '../../src/tools/composite/input-map.js'
import { createTmpProject, makeConfig } from '../fixtures.js'

describe('input-map', () => {
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

  // ==========================================
  // list
  // ==========================================
  describe('list', () => {
    it('should list input actions from project.godot', async () => {
      const result = await handleInputMap(
        'list',
        {
          project_path: projectPath,
        },
        config,
      )

      const data = JSON.parse(result.content[0].text)
      expect(data.count).toBeGreaterThan(0)
      const names = data.actions.map((a: { name: string }) => a.name)
      expect(names).toContain('move_left')
      expect(names).toContain('move_right')
      expect(names).toContain('jump')
    })

    it('should throw for missing project.godot', async () => {
      await expect(
        handleInputMap(
          'list',
          {
            project_path: '/nonexistent/path',
          },
          config,
        ),
      ).rejects.toThrow()
    })
  })

  // ==========================================
  // add_action
  // ==========================================
  describe('add_action', () => {
    it('should add a new input action', async () => {
      const result = await handleInputMap(
        'add_action',
        {
          project_path: projectPath,
          action_name: 'attack',
        },
        config,
      )

      expect(result.content[0].text).toContain('Added input action')
      const content = readFileSync(join(projectPath, 'project.godot'), 'utf-8')
      expect(content).toContain('attack={')
    })

    it('should add action with custom deadzone', async () => {
      await handleInputMap(
        'add_action',
        {
          project_path: projectPath,
          action_name: 'sprint',
          deadzone: 0.3,
        },
        config,
      )

      const content = readFileSync(join(projectPath, 'project.godot'), 'utf-8')
      expect(content).toContain('"deadzone": 0.3')
    })

    it('should throw for duplicate action', async () => {
      await expect(
        handleInputMap(
          'add_action',
          {
            project_path: projectPath,
            action_name: 'move_left',
          },
          config,
        ),
      ).rejects.toThrow('already exists')
    })

    it('should create [input] section if missing', async () => {
      const noInputContent = '[application]\nconfig/name="Test"\n'
      const tmp = createTmpProject(noInputContent)

      await handleInputMap(
        'add_action',
        {
          project_path: tmp.projectPath,
          action_name: 'fire',
        },
        makeConfig({ projectPath: tmp.projectPath }),
      )

      const content = readFileSync(join(tmp.projectPath, 'project.godot'), 'utf-8')
      expect(content).toContain('[input]')
      expect(content).toContain('fire={')

      tmp.cleanup()
    })
  })

  // ==========================================
  // remove_action
  // ==========================================
  describe('remove_action', () => {
    it('should remove existing action', async () => {
      const result = await handleInputMap(
        'remove_action',
        {
          project_path: projectPath,
          action_name: 'jump',
        },
        config,
      )

      expect(result.content[0].text).toContain('Removed input action')
      const content = readFileSync(join(projectPath, 'project.godot'), 'utf-8')
      expect(content).not.toContain('jump={')
    })

    it('should throw for non-existent action', async () => {
      await expect(
        handleInputMap(
          'remove_action',
          {
            project_path: projectPath,
            action_name: 'nonexistent',
          },
          config,
        ),
      ).rejects.toThrow('not found')
    })
  })

  // ==========================================
  // add_event
  // ==========================================
  describe('add_event', () => {
    it('should add key event to action', async () => {
      const result = await handleInputMap(
        'add_event',
        {
          project_path: projectPath,
          action_name: 'jump',
          event_type: 'key',
          event_value: 'KEY_SPACE',
        },
        config,
      )

      expect(result.content[0].text).toContain('Added key event')
      const content = readFileSync(join(projectPath, 'project.godot'), 'utf-8')
      expect(content).toContain('InputEventKey')
      expect(content).toContain('KEY_SPACE')
    })

    it('should throw for non-existent action', async () => {
      await expect(
        handleInputMap(
          'add_event',
          {
            project_path: projectPath,
            action_name: 'nonexistent',
            event_type: 'key',
            event_value: 'KEY_A',
          },
          config,
        ),
      ).rejects.toThrow('not found')
    })

    it('should throw for invalid event type', async () => {
      await expect(
        handleInputMap(
          'add_event',
          {
            project_path: projectPath,
            action_name: 'jump',
            event_type: 'unknown',
            event_value: 'value',
          },
          config,
        ),
      ).rejects.toThrow('Unknown event_type')
    })
  })

  it('should throw for unknown action', async () => {
    await expect(handleInputMap('invalid', {}, config)).rejects.toThrow('Unknown action')
  })
})
