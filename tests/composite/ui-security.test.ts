import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { GodotConfig } from '../../src/godot/types.js'
import { handleUI } from '../../src/tools/composite/ui.js'
import { handleAudio } from '../../src/tools/composite/audio.js'
import { createTmpProject, createTmpScene, makeConfig } from '../fixtures.js'

describe('Security: Scene Injection Prevention in UI and Audio tools', () => {
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

  describe('UI tool', () => {
    it('should prevent injection via node name in create_control', async () => {
      createTmpScene(projectPath, 'main.tscn')

      await expect(
        handleUI(
          'create_control',
          {
            project_path: projectPath,
            scene_path: 'main.tscn',
            name: 'Button"\n[node name="Malicious" type="Node"]\n"',
            type: 'Button',
          },
          config,
        ),
      ).rejects.toThrow('Invalid characters in parameters')
    })

    it('should prevent injection via type in create_control', async () => {
      createTmpScene(projectPath, 'main.tscn')

      await expect(
        handleUI(
          'create_control',
          {
            project_path: projectPath,
            scene_path: 'main.tscn',
            name: 'Button',
            type: 'Button"\n[node name="Malicious" type="Node"]\n"',
          },
          config,
        ),
      ).rejects.toThrow('Invalid characters in parameters')
    })

    it('should prevent injection via parent in create_control', async () => {
      createTmpScene(projectPath, 'main.tscn')

      await expect(
        handleUI(
          'create_control',
          {
            project_path: projectPath,
            scene_path: 'main.tscn',
            name: 'Button',
            type: 'Button',
            parent: '."\n[node name="Malicious" type="Node"]\n"',
          },
          config,
        ),
      ).rejects.toThrow('Invalid characters in parameters')
    })

    it('should prevent injection via node name in layout', async () => {
      createTmpScene(projectPath, 'main.tscn', '[node name="Button" type="Button"]')

      await expect(
        handleUI(
          'layout',
          {
            project_path: projectPath,
            scene_path: 'main.tscn',
            name: 'Button"\n[node name="Malicious" type="Node"]\n"',
            preset: 'full_rect',
          },
          config,
        ),
      ).rejects.toThrow('Invalid characters in parameters')
    })
  })

  describe('Audio tool', () => {
    it('should prevent injection via node name in create_stream', async () => {
      createTmpScene(projectPath, 'main.tscn')

      await expect(
        handleAudio(
          'create_stream',
          {
            project_path: projectPath,
            scene_path: 'main.tscn',
            name: 'AudioStreamPlayer"\n[node name="Malicious" type="Node"]\n"',
          },
          config,
        ),
      ).rejects.toThrow('Invalid characters in parameters')
    })

    it('should prevent injection via bus name in add_bus', async () => {
      await expect(
        handleAudio(
          'add_bus',
          {
            project_path: projectPath,
            bus_name: 'Master"\n[node name="Malicious" type="Node"]\n"',
          },
          config,
        ),
      ).rejects.toThrow('Invalid characters in parameters')
    })

    it('should prevent injection via effect type in add_effect', async () => {
      await expect(
        handleAudio(
          'add_effect',
          {
            project_path: projectPath,
            bus_name: 'Master',
            effect_type: 'Reverb"\n[node name="Malicious" type="Node"]\n"',
          },
          config,
        ),
      ).rejects.toThrow('Invalid characters in parameters')
    })
  })
})
