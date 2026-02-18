/**
 * Integration tests for Signals tool
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { GodotConfig } from '../../src/godot/types.js'
import { handleSignals } from '../../src/tools/composite/signals.js'
import { COMPLEX_TSCN, createTmpProject, createTmpScene, MINIMAL_TSCN, makeConfig } from '../fixtures.js'

describe('signals', () => {
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
    it('should list connections in scene', async () => {
      createTmpScene(projectPath, 'test.tscn', COMPLEX_TSCN)

      const result = await handleSignals(
        'list',
        {
          project_path: projectPath,
          scene_path: 'test.tscn',
        },
        config,
      )

      const data = JSON.parse(result.content[0].text)
      expect(data.count).toBe(2)
      expect(data.connections[0].signal).toBe('body_entered')
      expect(data.connections[0].from).toBe('Player')
      expect(data.connections[0].method).toBe('_on_body_entered')
    })

    it('should return empty list for scene without connections', async () => {
      createTmpScene(projectPath, 'empty.tscn', MINIMAL_TSCN)

      const result = await handleSignals(
        'list',
        {
          project_path: projectPath,
          scene_path: 'empty.tscn',
        },
        config,
      )

      const data = JSON.parse(result.content[0].text)
      expect(data.count).toBe(0)
    })
  })

  // ==========================================
  // connect
  // ==========================================
  describe('connect', () => {
    it('should add a signal connection', async () => {
      createTmpScene(projectPath, 'test.tscn', MINIMAL_TSCN)

      const result = await handleSignals(
        'connect',
        {
          project_path: projectPath,
          scene_path: 'test.tscn',
          signal: 'ready',
          from: 'Root',
          to: 'Root',
          method: '_on_ready',
        },
        config,
      )

      expect(result.content[0].text).toContain('Connected')
      const content = readFileSync(join(projectPath, 'test.tscn'), 'utf-8')
      expect(content).toContain('[connection signal="ready"')
      expect(content).toContain('method="_on_ready"')
    })

    it('should add connection with flags', async () => {
      createTmpScene(projectPath, 'test.tscn', MINIMAL_TSCN)

      await handleSignals(
        'connect',
        {
          project_path: projectPath,
          scene_path: 'test.tscn',
          signal: 'pressed',
          from: 'Root',
          to: 'Root',
          method: '_on_pressed',
          flags: 3,
        },
        config,
      )

      const content = readFileSync(join(projectPath, 'test.tscn'), 'utf-8')
      expect(content).toContain('flags=3')
    })

    it('should throw for duplicate connection', async () => {
      createTmpScene(projectPath, 'test.tscn', COMPLEX_TSCN)

      await expect(
        handleSignals(
          'connect',
          {
            project_path: projectPath,
            scene_path: 'test.tscn',
            signal: 'body_entered',
            from: 'Player',
            to: 'Player',
            method: '_on_body_entered',
          },
          config,
        ),
      ).rejects.toThrow('already exists')
    })

    it('should throw when missing required args', async () => {
      createTmpScene(projectPath, 'test.tscn', MINIMAL_TSCN)

      await expect(
        handleSignals(
          'connect',
          {
            project_path: projectPath,
            scene_path: 'test.tscn',
            signal: 'ready',
          },
          config,
        ),
      ).rejects.toThrow('required')
    })
  })

  // ==========================================
  // disconnect
  // ==========================================
  describe('disconnect', () => {
    it('should remove an existing connection', async () => {
      createTmpScene(projectPath, 'test.tscn', COMPLEX_TSCN)

      const result = await handleSignals(
        'disconnect',
        {
          project_path: projectPath,
          scene_path: 'test.tscn',
          signal: 'body_entered',
          from: 'Player',
          to: 'Player',
          method: '_on_body_entered',
        },
        config,
      )

      expect(result.content[0].text).toContain('Disconnected')
      const content = readFileSync(join(projectPath, 'test.tscn'), 'utf-8')
      expect(content).not.toContain('signal="body_entered"')
      // Other connection should remain
      expect(content).toContain('signal="pressed"')
    })

    it('should throw for non-existent connection', async () => {
      createTmpScene(projectPath, 'test.tscn', MINIMAL_TSCN)

      await expect(
        handleSignals(
          'disconnect',
          {
            project_path: projectPath,
            scene_path: 'test.tscn',
            signal: 'nonexistent',
            from: 'Root',
            to: 'Root',
            method: '_on_nothing',
          },
          config,
        ),
      ).rejects.toThrow('not found')
    })
  })

  // ==========================================
  // invalid
  // ==========================================
  it('should throw for unknown action', async () => {
    createTmpScene(projectPath, 'test.tscn', MINIMAL_TSCN)
    await expect(
      handleSignals(
        'invalid',
        {
          scene_path: 'test.tscn',
          project_path: projectPath,
        },
        config,
      ),
    ).rejects.toThrow('Unknown action')
  })
})
