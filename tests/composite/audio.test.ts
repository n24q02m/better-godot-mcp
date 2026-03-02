import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { GodotConfig } from '../../src/godot/types.js'
import { handleAudio } from '../../src/tools/composite/audio.js'
import { createTmpProject, createTmpScene, makeConfig, SAMPLE_BUS_LAYOUT } from '../fixtures.js'

describe('audio', () => {
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
  // list_buses
  // ==========================================
  describe('list_buses', () => {
    it('should list default Master bus when no layout exists', async () => {
      const result = await handleAudio('list_buses', { project_path: projectPath }, config)
      const data = JSON.parse(result.content[0].text)
      expect(data.buses).toHaveLength(1)
      expect(data.buses[0].name).toBe('Master')
    })

    it('should list buses from existing layout', async () => {
      // Create a layout file
      const layoutPath = join(projectPath, 'default_bus_layout.tres')
      const content = SAMPLE_BUS_LAYOUT
      // Write content manually since we don't have a helper for it, or use node:fs
      const { writeFileSync } = await import('node:fs')
      writeFileSync(layoutPath, content, 'utf-8')

      const result = await handleAudio('list_buses', { project_path: projectPath }, config)
      const data = JSON.parse(result.content[0].text)

      expect(data.buses).toHaveLength(2)
      expect(data.buses.find((b: { name: string }) => b.name === 'Music')).toBeDefined()
      expect(data.buses.find((b: { name: string }) => b.name === 'SFX')).toBeDefined()
    })

    it('should throw if project_path is missing', async () => {
      await expect(handleAudio('list_buses', {}, makeConfig())).rejects.toThrow('No project path specified')
    })
  })

  // ==========================================
  // add_bus
  // ==========================================
  describe('add_bus', () => {
    it('should create layout and add bus if not exists', async () => {
      const result = await handleAudio(
        'add_bus',
        {
          project_path: projectPath,
          bus_name: 'NewBus',
        },
        config,
      )

      expect(result.content[0].text).toContain('Added audio bus: NewBus')

      const layoutPath = join(projectPath, 'default_bus_layout.tres')
      expect(existsSync(layoutPath)).toBe(true)
      const content = readFileSync(layoutPath, 'utf-8')
      expect(content).toContain('bus/0/name = "Master"')
      expect(content).toContain('bus/1/name = "NewBus"')
    })

    it('should add bus to existing layout', async () => {
      // First add one bus
      await handleAudio('add_bus', { project_path: projectPath, bus_name: 'Bus1' }, config)

      // Then add another
      const result = await handleAudio(
        'add_bus',
        {
          project_path: projectPath,
          bus_name: 'Bus2',
          send_to: 'Bus1',
        },
        config,
      )

      expect(result.content[0].text).toContain('Added audio bus: Bus2')

      const content = readFileSync(join(projectPath, 'default_bus_layout.tres'), 'utf-8')
      expect(content).toContain('bus/1/name = "Bus1"')
      expect(content).toContain('bus/2/name = "Bus2"')
      expect(content).toContain('bus/2/send = "Bus1"')
    })

    it('should throw if bus_name is missing', async () => {
      await expect(handleAudio('add_bus', { project_path: projectPath }, config)).rejects.toThrow(
        'No bus_name specified',
      )
    })
  })

  // ==========================================
  // add_effect
  // ==========================================
  describe('add_effect', () => {
    it('should add effect to existing bus', async () => {
      // Create bus first
      await handleAudio('add_bus', { project_path: projectPath, bus_name: 'SFX' }, config)

      const result = await handleAudio(
        'add_effect',
        {
          project_path: projectPath,
          bus_name: 'SFX',
          effect_type: 'Reverb',
        },
        config,
      )

      expect(result.content[0].text).toContain('Added AudioEffectReverb to bus "SFX"')

      const content = readFileSync(join(projectPath, 'default_bus_layout.tres'), 'utf-8')
      expect(content).toContain('[sub_resource type="AudioEffectReverb"')
      expect(content).toContain('effect/0/effect = SubResource(')
    })

    it('should handle full effect type name', async () => {
      await handleAudio('add_bus', { project_path: projectPath, bus_name: 'Music' }, config)

      const result = await handleAudio(
        'add_effect',
        {
          project_path: projectPath,
          bus_name: 'Music',
          effect_type: 'AudioEffectEQ',
        },
        config,
      )

      expect(result.content[0].text).toContain('Added AudioEffectEQ to bus "Music"')
    })

    it('should append effect when [resource] section is missing in layout', async () => {
      // Create a layout missing the [resource] tag
      const layoutPath = join(projectPath, 'default_bus_layout.tres')
      const content = 'bus/0/name = "Master"\n'
      const { writeFileSync } = await import('node:fs')
      writeFileSync(layoutPath, content, 'utf-8')

      const result = await handleAudio(
        'add_effect',
        {
          project_path: projectPath,
          bus_name: 'Master',
          effect_type: 'Reverb',
        },
        config,
      )

      expect(result.content[0].text).toContain('Added AudioEffectReverb to bus "Master"')

      const newContent = readFileSync(layoutPath, 'utf-8')
      expect(newContent).toContain('[sub_resource type="AudioEffectReverb"')
    })

    it('should throw if bus not found', async () => {
      await expect(
        handleAudio(
          'add_effect',
          {
            project_path: projectPath,
            bus_name: 'NonExistent',
            effect_type: 'Reverb',
          },
          config,
        ),
      ).rejects.toThrow('Bus "NonExistent" not found')
    })

    it('should throw if missing args', async () => {
      await expect(
        handleAudio(
          'add_effect',
          {
            project_path: projectPath,
            bus_name: 'Master',
          },
          config,
        ),
      ).rejects.toThrow('bus_name and effect_type required')
    })
  })

  // ==========================================
  // create_stream
  // ==========================================
  describe('create_stream', () => {
    it('should create AudioStreamPlayer in scene', async () => {
      createTmpScene(projectPath, 'main.tscn')

      const result = await handleAudio(
        'create_stream',
        {
          project_path: projectPath,
          scene_path: 'main.tscn',
          name: 'BGM',
          bus: 'Music',
          stream_type: 'Global',
        },
        config,
      )

      expect(result.content[0].text).toContain('Created AudioStreamPlayer: BGM')

      const content = readFileSync(join(projectPath, 'main.tscn'), 'utf-8')
      expect(content).toContain('[node name="BGM" type="AudioStreamPlayer"')
      expect(content).toContain('bus = "Music"')
    })

    it('should create AudioStreamPlayer2D', async () => {
      createTmpScene(projectPath, 'level.tscn')

      const result = await handleAudio(
        'create_stream',
        {
          project_path: projectPath,
          scene_path: 'level.tscn',
          name: 'Sfx2D',
          stream_type: '2D',
        },
        config,
      )

      expect(result.content[0].text).toContain('Created AudioStreamPlayer2D')
      const content = readFileSync(join(projectPath, 'level.tscn'), 'utf-8')
      expect(content).toContain('type="AudioStreamPlayer2D"')
    })

    it('should create AudioStreamPlayer3D', async () => {
      createTmpScene(projectPath, 'world.tscn')

      const result = await handleAudio(
        'create_stream',
        {
          project_path: projectPath,
          scene_path: 'world.tscn',
          name: 'Sfx3D',
          stream_type: '3D',
        },
        config,
      )

      expect(result.content[0].text).toContain('Created AudioStreamPlayer3D')
      const content = readFileSync(join(projectPath, 'world.tscn'), 'utf-8')
      expect(content).toContain('type="AudioStreamPlayer3D"')
    })

    it('should throw if scene not found', async () => {
      await expect(
        handleAudio(
          'create_stream',
          {
            project_path: projectPath,
            scene_path: 'ghost.tscn',
          },
          config,
        ),
      ).rejects.toThrow('Scene not found')
    })
  })

  // ==========================================
  // Invalid Action
  // ==========================================
  it('should throw for unknown action', async () => {
    await expect(handleAudio('invalid_action', { project_path: projectPath }, config)).rejects.toThrow('Unknown action')
  })
})
