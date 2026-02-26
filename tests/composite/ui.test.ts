/**
 * Integration tests for UI tool
 */

import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { GodotConfig } from '../../src/godot/types.js'
import { handleUI } from '../../src/tools/composite/ui.js'
import { createTmpProject, createTmpScene, makeConfig } from '../fixtures.js'

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

      const names = data.controls.map((c: any) => c.name)
      expect(names).toContain('Root')
      expect(names).toContain('Button')
      expect(names).toContain('Label')
      expect(names).toContain('Container')
      expect(names).toContain('InnerLabel')
      expect(names).not.toContain('Node2D')
      expect(names).not.toContain('Sprite')

      // Check parent pointers
      const innerLabel = data.controls.find((c: any) => c.name === 'InnerLabel')
      expect(innerLabel.parent).toBe('Container')

      const button = data.controls.find((c: any) => c.name === 'Button')
      expect(button.parent).toBe('.')

      const root = data.controls.find((c: any) => c.name === 'Root')
      expect(root.parent).toBe('(root)')
    })
  })
})
