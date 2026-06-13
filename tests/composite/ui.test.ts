import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { GodotConfig } from '../../src/godot/types.js'
import { handleUI } from '../../src/tools/composite/ui.js'
import { createTmpProject, createTmpScene, MINIMAL_TSCN, makeConfig } from '../fixtures.js'

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
    it('should create a Label node with given name', async () => {
      createTmpScene(projectPath, 'test.tscn', MINIMAL_TSCN)

      const result = await handleUI(
        'create_control',
        {
          project_path: projectPath,
          scene_path: 'test.tscn',
          name: 'MyLabel',
          type: 'Label',
        },
        config,
      )

      expect(result.content[0].text).toContain('Created UI control')
      const content = readFileSync(join(projectPath, 'test.tscn'), 'utf-8')
      expect(content).toContain('[node name="MyLabel" type="Label"]')
      expect(content).toContain('text = "Label"')
    })

    it('should create Button with default text property', async () => {
      createTmpScene(projectPath, 'test.tscn', MINIMAL_TSCN)

      await handleUI(
        'create_control',
        {
          project_path: projectPath,
          scene_path: 'test.tscn',
          name: 'MyButton',
          type: 'Button',
        },
        config,
      )

      const content = readFileSync(join(projectPath, 'test.tscn'), 'utf-8')
      expect(content).toContain('[node name="MyButton" type="Button"]')
      expect(content).toContain('text = "Click"')
    })

    it('should create control under specific parent', async () => {
      createTmpScene(projectPath, 'test.tscn', MINIMAL_TSCN)

      await handleUI(
        'create_control',
        {
          project_path: projectPath,
          scene_path: 'test.tscn',
          name: 'ChildLabel',
          type: 'Label',
          parent: '.',
        },
        config,
      )

      const content = readFileSync(join(projectPath, 'test.tscn'), 'utf-8')
      expect(content).not.toContain('parent=')
    })

    it('should add custom properties when properties object provided', async () => {
      createTmpScene(projectPath, 'test.tscn', MINIMAL_TSCN)

      await handleUI(
        'create_control',
        {
          project_path: projectPath,
          scene_path: 'test.tscn',
          name: 'CustomButton',
          type: 'Button',
          properties: {
            flat: 'true',
            clip_text: 'true',
          },
        },
        config,
      )

      const content = readFileSync(join(projectPath, 'test.tscn'), 'utf-8')
      expect(content).toContain('flat = true')
      expect(content).toContain('clip_text = true')
    })

    it('should throw if no scene_path provided', async () => {
      await expect(
        handleUI(
          'create_control',
          {
            project_path: projectPath,
            name: 'Control',
          },
          config,
        ),
      ).rejects.toThrow('No scene_path specified')
    })

    it('should throw if no name provided', async () => {
      await expect(
        handleUI(
          'create_control',
          {
            project_path: projectPath,
            scene_path: 'test.tscn',
          },
          config,
        ),
      ).rejects.toThrow('No name specified')
    })

    it('should throw if scene not found', async () => {
      await expect(
        handleUI(
          'create_control',
          {
            project_path: projectPath,
            scene_path: 'ghost.tscn',
            name: 'Control',
          },
          config,
        ),
      ).rejects.toThrow('Scene not found')
    })
  })

  describe('set_theme', () => {
    it('should create theme .tres file with default font_size 16', async () => {
      const result = await handleUI(
        'set_theme',
        {
          project_path: projectPath,
          theme_path: 'main_theme.tres',
        },
        config,
      )

      expect(result.content[0].text).toContain('Created theme')
      const content = readFileSync(join(projectPath, 'main_theme.tres'), 'utf-8')
      expect(content).toContain('default_font_size = 16')
    })

    it('should use custom font_size when provided', async () => {
      await handleUI(
        'set_theme',
        {
          project_path: projectPath,
          theme_path: 'large_theme.tres',
          font_size: 24,
        },
        config,
      )

      const content = readFileSync(join(projectPath, 'large_theme.tres'), 'utf-8')
      expect(content).toContain('default_font_size = 24')
    })

    it('should throw if no theme_path provided', async () => {
      await expect(
        handleUI(
          'set_theme',
          {
            project_path: projectPath,
          },
          config,
        ),
      ).rejects.toThrow('No theme_path specified')
    })
  })

  describe('layout', () => {
    it('should apply full_rect preset anchors_preset=15', async () => {
      createTmpScene(projectPath, 'test.tscn', MINIMAL_TSCN)

      await handleUI(
        'layout',
        {
          project_path: projectPath,
          scene_path: 'test.tscn',
          name: 'Root',
          preset: 'full_rect',
        },
        config,
      )

      const content = readFileSync(join(projectPath, 'test.tscn'), 'utf-8')
      expect(content).toContain('anchors_preset = 15')
      expect(content).toContain('anchor_right = 1.0')
      expect(content).toContain('anchor_bottom = 1.0')
    })

    it('should apply center preset anchors_preset=8', async () => {
      createTmpScene(projectPath, 'test.tscn', MINIMAL_TSCN)

      await handleUI(
        'layout',
        {
          project_path: projectPath,
          scene_path: 'test.tscn',
          name: 'Root',
          preset: 'center',
        },
        config,
      )

      const content = readFileSync(join(projectPath, 'test.tscn'), 'utf-8')
      expect(content).toContain('anchors_preset = 8')
      expect(content).toContain('anchor_left = 0.5')
      expect(content).toContain('anchor_top = 0.5')
    })

    it('should apply top_wide preset anchors_preset=10', async () => {
      createTmpScene(projectPath, 'test.tscn', MINIMAL_TSCN)

      await handleUI(
        'layout',
        {
          project_path: projectPath,
          scene_path: 'test.tscn',
          name: 'Root',
          preset: 'top_wide',
        },
        config,
      )

      const content = readFileSync(join(projectPath, 'test.tscn'), 'utf-8')
      expect(content).toContain('anchors_preset = 10')
      expect(content).toContain('anchor_right = 1.0')
    })

    it('should throw for unknown preset', async () => {
      createTmpScene(projectPath, 'test.tscn', MINIMAL_TSCN)

      await expect(
        handleUI(
          'layout',
          {
            project_path: projectPath,
            scene_path: 'test.tscn',
            name: 'Root',
            preset: 'invalid_preset',
          },
          config,
        ),
      ).rejects.toThrow('Unknown layout preset')
    })

    it('should throw if node not found in scene', async () => {
      createTmpScene(projectPath, 'test.tscn', MINIMAL_TSCN)

      await expect(
        handleUI(
          'layout',
          {
            project_path: projectPath,
            scene_path: 'test.tscn',
            name: 'NonExistentNode',
          },
          config,
        ),
      ).rejects.toThrow('Node "NonExistentNode" not found')
    })

    it('should throw if scene not found', async () => {
      await expect(
        handleUI(
          'layout',
          {
            project_path: projectPath,
            scene_path: 'ghost.tscn',
            name: 'Root',
          },
          config,
        ),
      ).rejects.toThrow('Scene not found')
    })
  })

  describe('list_controls', () => {
    it('should list only control nodes', async () => {
      const UI_SCENE = `[gd_scene format=3]

[node name="Root" type="Node2D"]

[node name="MyLabel" type="Label" parent="."]

[node name="MyButton" type="Button" parent="."]

[node name="Sprite" type="Sprite2D" parent="."]
`
      createTmpScene(projectPath, 'test.tscn', UI_SCENE)

      const result = await handleUI(
        'list_controls',
        {
          project_path: projectPath,
          scene_path: 'test.tscn',
        },
        config,
      )

      const data = JSON.parse(result.content[0].text)
      expect(data.count).toBe(2)
      expect(data.controls[0].name).toBe('MyLabel')
      expect(data.controls[1].name).toBe('MyButton')
    })
  })

  it('should throw for unknown action', async () => {
    await expect(handleUI('invalid_action', {}, config)).rejects.toThrow('Unknown action')
  })
})
