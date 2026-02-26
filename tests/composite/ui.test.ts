import { readFileSync } from 'node:fs'
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

  // ==========================================
  // create_control
  // ==========================================
  describe('create_control', () => {
    it('should create a control with default properties', async () => {
      createTmpScene(projectPath, 'ui.tscn', MINIMAL_TSCN)

      const result = await handleUI(
        'create_control',
        {
          project_path: projectPath,
          scene_path: 'ui.tscn',
          name: 'MyButton',
          type: 'Button',
        },
        config,
      )

      expect(result.content[0].text).toContain('Created UI control: MyButton')
      const content = readFileSync(join(projectPath, 'ui.tscn'), 'utf-8')
      expect(content).toContain('name="MyButton"')
      expect(content).toContain('type="Button"')
      expect(content).toContain('text = "Click"')
    })

    it('should create a control with custom properties', async () => {
      createTmpScene(projectPath, 'ui.tscn', MINIMAL_TSCN)

      const result = await handleUI(
        'create_control',
        {
          project_path: projectPath,
          scene_path: 'ui.tscn',
          name: 'MyLabel',
          type: 'Label',
          properties: {
            text: '"Hello World"',
            custom_minimum_size: 'Vector2(100, 50)',
          },
        },
        config,
      )

      const content = readFileSync(join(projectPath, 'ui.tscn'), 'utf-8')
      expect(content).toContain('text = "Hello World"')
      expect(content).toContain('custom_minimum_size = Vector2(100, 50)')
    })

    it('should create a control with parent', async () => {
      // Create scene with a container
      const sceneContent = `[gd_scene format=3]

[node name="Root" type="Control"]

[node name="Container" type="VBoxContainer" parent="."]
`
      createTmpScene(projectPath, 'ui.tscn', sceneContent)

      await handleUI(
        'create_control',
        {
          project_path: projectPath,
          scene_path: 'ui.tscn',
          name: 'ChildButton',
          type: 'Button',
          parent: 'Container',
        },
        config,
      )

      const content = readFileSync(join(projectPath, 'ui.tscn'), 'utf-8')
      expect(content).toContain('name="ChildButton"')
      expect(content).toContain('parent="Container"')
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

  // ==========================================
  // set_theme
  // ==========================================
  describe('set_theme', () => {
    it('should create a theme resource', async () => {
      const result = await handleUI(
        'set_theme',
        {
          project_path: projectPath,
          theme_path: 'themes/main.tres',
          font_size: 20,
        },
        config,
      )

      expect(result.content[0].text).toContain('Created theme: themes/main.tres')
      const content = readFileSync(join(projectPath, 'themes/main.tres'), 'utf-8')
      expect(content).toContain('[gd_resource type="Theme" format=3]')
      expect(content).toContain('default_font_size = 20')
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

  // ==========================================
  // layout
  // ==========================================
  describe('layout', () => {
    it('should set layout preset', async () => {
      const sceneContent = `[gd_scene format=3]

[node name="Root" type="Control"]

[node name="MyPanel" type="Panel" parent="."]
`
      createTmpScene(projectPath, 'ui.tscn', sceneContent)

      const result = await handleUI(
        'layout',
        {
          project_path: projectPath,
          scene_path: 'ui.tscn',
          name: 'MyPanel',
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

    it('should throw for unknown preset', async () => {
      createTmpScene(projectPath, 'ui.tscn', MINIMAL_TSCN)

      await expect(
        handleUI(
          'layout',
          {
            project_path: projectPath,
            scene_path: 'ui.tscn',
            name: 'Root',
            preset: 'invalid_preset',
          },
          config,
        ),
      ).rejects.toThrow('Unknown layout preset')
    })

    it('should throw if node not found', async () => {
      createTmpScene(projectPath, 'ui.tscn', MINIMAL_TSCN)

      await expect(
        handleUI(
          'layout',
          {
            project_path: projectPath,
            scene_path: 'ui.tscn',
            name: 'NonExistentNode',
            preset: 'full_rect',
          },
          config,
        ),
      ).rejects.toThrow('Node "NonExistentNode" not found')
    })
  })

  // ==========================================
  // list_controls
  // ==========================================
  describe('list_controls', () => {
    it('should list only UI controls', async () => {
      const sceneContent = `[gd_scene format=3]

[node name="Root" type="Control"]

[node name="Button" type="Button" parent="."]

[node name="Timer" type="Timer" parent="."]

[node name="Sprite" type="Sprite2D" parent="."]
`
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
      expect(data.count).toBe(2) // Root (Control) and Button
      expect(data.controls).toHaveLength(2)
      expect(data.controls.map((c: any) => c.name)).toContain('Root')
      expect(data.controls.map((c: any) => c.name)).toContain('Button')
      expect(data.controls.map((c: any) => c.name)).not.toContain('Timer')
      expect(data.controls.map((c: any) => c.name)).not.toContain('Sprite')
    })

    it('should throw if scene_path is missing', async () => {
      await expect(
        handleUI(
          'list_controls',
          {
            project_path: projectPath,
          },
          config,
        ),
      ).rejects.toThrow('No scene_path specified')
    })
  })

  // ==========================================
  // Invalid Action
  // ==========================================
  it('should throw for unknown action', async () => {
    await expect(handleUI('invalid_action', {}, config)).rejects.toThrow('Unknown action')
  })
})
