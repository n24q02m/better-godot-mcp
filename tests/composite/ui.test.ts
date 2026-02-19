import { readFileSync, existsSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { GodotConfig } from '../../src/godot/types.js'
import { handleUI } from '../../src/tools/composite/ui.js'
import { createTmpProject, createTmpScene, makeConfig, MINIMAL_TSCN } from '../fixtures.js'

describe('ui', () => {
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

  describe('create_control', () => {
    it('should create a control with defaults', async () => {
      createTmpScene(projectPath, 'ui.tscn', MINIMAL_TSCN)

      const result = await handleUI(
        'create_control',
        {
          project_path: projectPath,
          scene_path: 'ui.tscn',
          name: 'StartButton',
          type: 'Button',
          parent: 'Root',
        },
        config,
      )

      expect(result.content[0].text).toContain('Created UI control: StartButton')
      const content = readFileSync(join(projectPath, 'ui.tscn'), 'utf-8')
      expect(content).toContain('[node name="StartButton" type="Button" parent="Root"]')
      expect(content).toContain('text = "Click"')
    })

    it('should create a control with custom properties', async () => {
      createTmpScene(projectPath, 'ui.tscn', MINIMAL_TSCN)

      await handleUI(
        'create_control',
        {
          project_path: projectPath,
          scene_path: 'ui.tscn',
          name: 'CustomLabel',
          type: 'Label',
          parent: 'Root',
          properties: {
            text: '"Hello World"',
            horizontal_alignment: '1',
          },
        },
        config,
      )

      const content = readFileSync(join(projectPath, 'ui.tscn'), 'utf-8')
      expect(content).toContain('[node name="CustomLabel" type="Label" parent="Root"]')
      expect(content).toContain('text = "Hello World"')
      expect(content).toContain('horizontal_alignment = 1')
    })

    it('should throw if scene_path is missing', async () => {
      await expect(
        handleUI(
          'create_control',
          {
            project_path: projectPath,
            name: 'Button',
          },
          config,
        ),
      ).rejects.toThrow('No scene_path specified')
    })

    it('should throw if name is missing', async () => {
      createTmpScene(projectPath, 'ui.tscn', MINIMAL_TSCN)
      await expect(
        handleUI(
          'create_control',
          {
            project_path: projectPath,
            scene_path: 'ui.tscn',
            type: 'Button',
          },
          config,
        ),
      ).rejects.toThrow('No name specified')
    })
  })

  describe('set_theme', () => {
    it('should create a theme file', async () => {
      const result = await handleUI(
        'set_theme',
        {
          project_path: projectPath,
          theme_path: 'ui_theme.tres',
          font_size: 24,
        },
        config,
      )

      expect(result.content[0].text).toContain('Created theme: ui_theme.tres')
      const themePath = join(projectPath, 'ui_theme.tres')
      expect(existsSync(themePath)).toBe(true)
      const content = readFileSync(themePath, 'utf-8')
      expect(content).toContain('[gd_resource type="Theme" format=3]')
      expect(content).toContain('default_font_size = 24')
    })

    it('should throw if theme_path is missing', async () => {
      await expect(
        handleUI(
          'set_theme',
          {
            project_path: projectPath,
            font_size: 16,
          },
          config,
        ),
      ).rejects.toThrow('No theme_path specified')
    })
  })

  describe('layout', () => {
    it('should apply full_rect preset', async () => {
      createTmpScene(projectPath, 'ui.tscn', MINIMAL_TSCN + '\n[node name="Panel" type="Panel" parent="."]\n')

      const result = await handleUI(
        'layout',
        {
          project_path: projectPath,
          scene_path: 'ui.tscn',
          name: 'Panel',
          preset: 'full_rect',
        },
        config,
      )

      expect(result.content[0].text).toContain('Set layout preset "full_rect"')
      const content = readFileSync(join(projectPath, 'ui.tscn'), 'utf-8')
      expect(content).toContain('anchors_preset = 15')
      expect(content).toContain('anchor_right = 1.0')
      expect(content).toContain('anchor_bottom = 1.0')
    })

    it('should apply center preset', async () => {
      createTmpScene(projectPath, 'ui.tscn', MINIMAL_TSCN + '\n[node name="Panel" type="Panel" parent="."]\n')

      const result = await handleUI(
        'layout',
        {
          project_path: projectPath,
          scene_path: 'ui.tscn',
          name: 'Panel',
          preset: 'center',
        },
        config,
      )

      expect(result.content[0].text).toContain('Set layout preset "center"')
      const content = readFileSync(join(projectPath, 'ui.tscn'), 'utf-8')
      expect(content).toContain('anchors_preset = 8')
      expect(content).toContain('anchor_left = 0.5')
      expect(content).toContain('anchor_top = 0.5')
    })

    it('should throw if node not found', async () => {
      createTmpScene(projectPath, 'ui.tscn', MINIMAL_TSCN)

      await expect(
        handleUI(
          'layout',
          {
            project_path: projectPath,
            scene_path: 'ui.tscn',
            name: 'MissingNode',
            preset: 'full_rect',
          },
          config,
        ),
      ).rejects.toThrow('Node "MissingNode" not found')
    })

    it('should throw if preset is invalid', async () => {
      createTmpScene(projectPath, 'ui.tscn', MINIMAL_TSCN + '\n[node name="Panel" type="Panel" parent="."]\n')

      await expect(
        handleUI(
          'layout',
          {
            project_path: projectPath,
            scene_path: 'ui.tscn',
            name: 'Panel',
            preset: 'invalid_preset',
          },
          config,
        ),
      ).rejects.toThrow('Unknown layout preset: invalid_preset')
    })
  })

  describe('list_controls', () => {
    it('should list controls in scene', async () => {
      const sceneContent = MINIMAL_TSCN +
        '\n[node name="MyButton" type="Button" parent="."]\n' +
        '\n[node name="MyLabel" type="Label" parent="."]\n'
      createTmpScene(projectPath, 'ui.tscn', sceneContent)

      const result = await handleUI(
        'list_controls',
        {
          project_path: projectPath,
          scene_path: 'ui.tscn',
        },
        config,
      )

      const data = JSON.parse(result.content[0].text)
      expect(data.scene).toBe('ui.tscn')
      expect(data.count).toBe(2)
      expect(data.controls).toHaveLength(2)
      expect(data.controls).toEqual(expect.arrayContaining([
        expect.objectContaining({ name: 'MyButton', type: 'Button' }),
        expect.objectContaining({ name: 'MyLabel', type: 'Label' }),
      ]))
    })

    it('should return empty list if no controls found', async () => {
      createTmpScene(projectPath, 'empty_ui.tscn', MINIMAL_TSCN) // Root is Node2D, not a control

      const result = await handleUI(
        'list_controls',
        {
          project_path: projectPath,
          scene_path: 'empty_ui.tscn',
        },
        config,
      )

      const data = JSON.parse(result.content[0].text)
      expect(data.count).toBe(0)
      expect(data.controls).toHaveLength(0)
    })
  })
})
