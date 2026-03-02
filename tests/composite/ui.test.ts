/**
 * Integration tests for UI tool
 */

import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { GodotConfig } from '../../src/godot/types.js'
import { handleUI } from '../../src/tools/composite/ui.js'
import { createTmpProject, createTmpScene, MINIMAL_TSCN, makeConfig } from '../fixtures.js'

const CONTROL_SCENE = `[gd_scene format=3]\n\n[node name="Root" type="Control"]\n`

const UI_SCENE = `[gd_scene load_steps=1 format=3 uid="uid://test"]

[node name="Root" type="Control"]
layout_mode = 3
anchors_preset = 15
anchor_right = 1.0
anchor_bottom = 1.0
grow_horizontal = 2
grow_vertical = 2

[node name="Button" type="Button" parent="."]
layout_mode = 0
offset_right = 8.0
offset_bottom = 8.0
text = "Click me"

[node name="Label" type="Label" parent="."]
layout_mode = 0
offset_top = 20.0
offset_right = 40.0
offset_bottom = 43.0
text = "Hello"

[node name="Container" type="VBoxContainer" parent="."]
layout_mode = 0
offset_top = 50.0
offset_right = 100.0
offset_bottom = 100.0

[node name="InnerLabel" type="Label" parent="Container"]
layout_mode = 2
text = "Inner"

[node name="Node2D" type="Node2D" parent="."]
position = Vector2(100, 100)

[node name="Sprite" type="Sprite2D" parent="Node2D"]
texture = ExtResource("1_xxxxx")
`

interface ControlInfo {
  name: string
  type: string
  parent: string
}

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
  // list_controls
  // ==========================================
  describe('list_controls', () => {
    it('should list only control nodes', async () => {
      createTmpScene(projectPath, 'ui_test.tscn', UI_SCENE)

      const result = await handleUI(
        'list_controls',
        {
          project_path: projectPath,
          scene_path: 'ui_test.tscn',
        },
        config,
      )

      const data = JSON.parse(result.content[0].text)
      expect(data.count).toBe(5)
      expect(data.controls).toHaveLength(5)

      const names = data.controls.map((c: ControlInfo) => c.name)
      expect(names).toContain('Root')
      expect(names).toContain('Button')
      expect(names).toContain('Label')
      expect(names).toContain('Container')
      expect(names).toContain('InnerLabel')
      expect(names).not.toContain('Node2D')
      expect(names).not.toContain('Sprite')

      // Check parent pointers
      const innerLabel = data.controls.find((c: ControlInfo) => c.name === 'InnerLabel')
      expect(innerLabel).toBeDefined()
      expect(innerLabel?.parent).toBe('Container')

      const button = data.controls.find((c: ControlInfo) => c.name === 'Button')
      expect(button).toBeDefined()
      expect(button?.parent).toBe('.')

      const root = data.controls.find((c: ControlInfo) => c.name === 'Root')
      expect(root).toBeDefined()
      expect(root?.parent).toBe('(root)')
    })

    it('should throw if no scene_path provided', async () => {
      await expect(handleUI('list_controls', { project_path: projectPath }, config)).rejects.toThrow(
        'No scene_path specified',
      )
    })
  })

  // ==========================================
  // create_control
  // ==========================================
  describe('create_control', () => {
    it('should create a Label node with given name', async () => {
      createTmpScene(projectPath, 'test.tscn', MINIMAL_TSCN)

      const result = await handleUI(
        'create_control',
        { scene_path: 'test.tscn', name: 'MyLabel', type: 'Label' },
        config,
      )

      expect(result.content[0].text).toContain('MyLabel')
      const content = readFileSync(join(projectPath, 'test.tscn'), 'utf-8')
      expect(content).toContain('[node name="MyLabel" type="Label"')
    })

    it('should create Button with default text property', async () => {
      createTmpScene(projectPath, 'test.tscn', MINIMAL_TSCN)

      await handleUI('create_control', { scene_path: 'test.tscn', name: 'MyButton', type: 'Button' }, config)

      const content = readFileSync(join(projectPath, 'test.tscn'), 'utf-8')
      expect(content).toContain('text = "Click"')
    })

    it('should create control under specific parent', async () => {
      createTmpScene(projectPath, 'test.tscn', MINIMAL_TSCN)

      await handleUI(
        'create_control',
        { scene_path: 'test.tscn', name: 'ChildLabel', type: 'Label', parent: 'Root' },
        config,
      )

      const content = readFileSync(join(projectPath, 'test.tscn'), 'utf-8')
      expect(content).toContain('parent="Root"')
    })

    it('should add custom properties when properties object provided', async () => {
      createTmpScene(projectPath, 'test.tscn', MINIMAL_TSCN)

      await handleUI(
        'create_control',
        {
          scene_path: 'test.tscn',
          name: 'Progress',
          type: 'ProgressBar',
          properties: { custom_minimum_size: 'Vector2(200, 20)' },
        },
        config,
      )

      const content = readFileSync(join(projectPath, 'test.tscn'), 'utf-8')
      expect(content).toContain('custom_minimum_size = Vector2(200, 20)')
    })

    it('should throw if no scene_path provided', async () => {
      await expect(handleUI('create_control', { name: 'MyLabel', type: 'Label' }, config)).rejects.toThrow(
        'No scene_path specified',
      )
    })

    it('should throw if no name provided', async () => {
      createTmpScene(projectPath, 'test.tscn', MINIMAL_TSCN)

      await expect(handleUI('create_control', { scene_path: 'test.tscn', type: 'Label' }, config)).rejects.toThrow(
        'No name specified',
      )
    })

    it('should throw if scene not found', async () => {
      await expect(handleUI('create_control', { scene_path: 'ghost.tscn', name: 'MyLabel' }, config)).rejects.toThrow(
        'Scene not found',
      )
    })

    it('should default to Control type if not specified', async () => {
      createTmpScene(projectPath, 'test.tscn', MINIMAL_TSCN)

      await handleUI('create_control', { scene_path: 'test.tscn', name: 'MyControl' }, config)

      const fileContent = readFileSync(join(projectPath, 'test.tscn'), 'utf-8')
      expect(fileContent).toContain('[node name="MyControl" type="Control"')
    })
  })

  // ==========================================
  // set_theme
  // ==========================================
  describe('set_theme', () => {
    it('should create theme .tres file with default font_size 16', async () => {
      const result = await handleUI('set_theme', { theme_path: 'themes/main.tres' }, config)

      expect(result.content[0].text).toContain('Created theme')
      expect(existsSync(join(projectPath, 'themes/main.tres'))).toBe(true)
    })

    it('should use custom font_size when provided', async () => {
      await handleUI('set_theme', { theme_path: 'themes/custom.tres', font_size: 24 }, config)

      const content = readFileSync(join(projectPath, 'themes/custom.tres'), 'utf-8')
      expect(content).toContain('default_font_size = 24')
    })

    it('should throw if no theme_path provided', async () => {
      await expect(handleUI('set_theme', {}, config)).rejects.toThrow('No theme_path specified')
    })

    it('should handle optional font_color and bg_color without crashing', async () => {
      await handleUI(
        'set_theme',
        { theme_path: 'themes/colors.tres', font_color: 'Color(1, 0, 0, 1)', bg_color: 'Color(0, 0, 0, 1)' },
        config,
      )

      const fileContent = readFileSync(join(projectPath, 'themes/colors.tres'), 'utf-8')
      expect(fileContent).toContain('default_font_size = 16')
    })

    it('should create nested directories if they do not exist', async () => {
      await handleUI('set_theme', { theme_path: 'deep/nested/path/to/theme.tres' }, config)

      expect(existsSync(join(projectPath, 'deep/nested/path/to/theme.tres'))).toBe(true)
    })
  })

  // ==========================================
  // layout
  // ==========================================
  describe('layout', () => {
    it('should apply full_rect preset anchors_preset=15', async () => {
      createTmpScene(projectPath, 'ctrl.tscn', CONTROL_SCENE)

      await handleUI('layout', { scene_path: 'ctrl.tscn', name: 'Root', preset: 'full_rect' }, config)

      const content = readFileSync(join(projectPath, 'ctrl.tscn'), 'utf-8')
      expect(content).toContain('anchors_preset = 15')
    })

    it('should apply center preset anchors_preset=8', async () => {
      createTmpScene(projectPath, 'ctrl.tscn', CONTROL_SCENE)

      await handleUI('layout', { scene_path: 'ctrl.tscn', name: 'Root', preset: 'center' }, config)

      const content = readFileSync(join(projectPath, 'ctrl.tscn'), 'utf-8')
      expect(content).toContain('anchors_preset = 8')
    })

    it('should apply top_wide preset anchors_preset=10', async () => {
      createTmpScene(projectPath, 'ctrl.tscn', CONTROL_SCENE)

      await handleUI('layout', { scene_path: 'ctrl.tscn', name: 'Root', preset: 'top_wide' }, config)

      const content = readFileSync(join(projectPath, 'ctrl.tscn'), 'utf-8')
      expect(content).toContain('anchors_preset = 10')
    })

    it('should apply bottom_wide preset anchors_preset=12', async () => {
      createTmpScene(projectPath, 'ctrl.tscn', CONTROL_SCENE)

      await handleUI('layout', { scene_path: 'ctrl.tscn', name: 'Root', preset: 'bottom_wide' }, config)

      const fileContent = readFileSync(join(projectPath, 'ctrl.tscn'), 'utf-8')
      expect(fileContent).toContain('anchors_preset = 12')
    })

    it('should apply left_wide preset anchors_preset=9', async () => {
      createTmpScene(projectPath, 'ctrl.tscn', CONTROL_SCENE)

      await handleUI('layout', { scene_path: 'ctrl.tscn', name: 'Root', preset: 'left_wide' }, config)

      const fileContent = readFileSync(join(projectPath, 'ctrl.tscn'), 'utf-8')
      expect(fileContent).toContain('anchors_preset = 9')
    })

    it('should apply right_wide preset anchors_preset=11', async () => {
      createTmpScene(projectPath, 'ctrl.tscn', CONTROL_SCENE)

      await handleUI('layout', { scene_path: 'ctrl.tscn', name: 'Root', preset: 'right_wide' }, config)

      const fileContent = readFileSync(join(projectPath, 'ctrl.tscn'), 'utf-8')
      expect(fileContent).toContain('anchors_preset = 11')
    })

    it('should throw if no scene_path provided', async () => {
      await expect(handleUI('layout', { name: 'Root', preset: 'full_rect' }, config)).rejects.toThrow(
        'No scene_path specified',
      )
    })

    it('should throw if no name provided', async () => {
      createTmpScene(projectPath, 'ctrl.tscn', CONTROL_SCENE)

      await expect(handleUI('layout', { scene_path: 'ctrl.tscn', preset: 'full_rect' }, config)).rejects.toThrow(
        'No name specified',
      )
    })

    it('should throw for unknown preset', async () => {
      createTmpScene(projectPath, 'ctrl.tscn', CONTROL_SCENE)

      await expect(
        handleUI('layout', { scene_path: 'ctrl.tscn', name: 'Root', preset: 'invalid_preset' }, config),
      ).rejects.toThrow('Unknown layout preset')
    })

    it('should throw if node not found in scene', async () => {
      createTmpScene(projectPath, 'ctrl.tscn', CONTROL_SCENE)

      await expect(
        handleUI('layout', { scene_path: 'ctrl.tscn', name: 'NonExistent', preset: 'full_rect' }, config),
      ).rejects.toThrow('not found')
    })

    it('should throw if scene not found', async () => {
      await expect(
        handleUI('layout', { scene_path: 'ghost.tscn', name: 'Root', preset: 'full_rect' }, config),
      ).rejects.toThrow('Scene not found')
    })
  })

  // ==========================================
  // errors
  // ==========================================
  it('should throw for unknown action', async () => {
    await expect(handleUI('unknown', {}, config)).rejects.toThrow('Unknown action')
  })
})
