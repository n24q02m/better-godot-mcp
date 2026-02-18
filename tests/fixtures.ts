/**
 * Shared test fixtures - Factory functions + sample content constants
 */

import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import type { GodotConfig } from '../src/godot/types.js'

// =============================================
// Sample .tscn content
// =============================================

export const MINIMAL_TSCN = `[gd_scene format=3]

[node name="Root" type="Node2D"]
`

export const COMPLEX_TSCN = `[gd_scene load_steps=4 format=3 uid="uid://abc123"]

[ext_resource type="Script" uid="uid://def456" path="res://player.gd" id="1_abc"]
[ext_resource type="Texture2D" uid="uid://ghi789" path="res://icon.svg" id="2_def"]

[sub_resource type="RectangleShape2D" id="RectangleShape2D_abc"]
size = Vector2(32, 32)

[sub_resource type="CircleShape2D" id="CircleShape2D_def"]
radius = 16.0

[node name="Player" type="CharacterBody2D"]
script = ExtResource("1_abc")
position = Vector2(100, 200)
speed = 300

[node name="Sprite" type="Sprite2D" parent="."]
texture = ExtResource("2_def")
scale = Vector2(0.5, 0.5)

[node name="CollisionShape" type="CollisionShape2D" parent="."]
shape = SubResource("RectangleShape2D_abc")

[node name="Camera" type="Camera2D" parent="."]
zoom = Vector2(2, 2)

[node name="UI" type="CanvasLayer" parent="."]

[node name="Label" type="Label" parent="UI"]
text = "Hello"

[connection signal="body_entered" from="Player" to="Player" method="_on_body_entered"]
[connection signal="pressed" from="UI/Label" to="Player" method="_on_label_pressed" flags=1]
`

export const SCENE_WITH_GROUPS = `[gd_scene format=3]

[node name="Root" type="Node2D"]

[node name="Enemy" type="CharacterBody2D" parent="." groups=["enemies", "damageable"]]

[node name="Coin" type="Area2D" parent="." groups=["collectibles"]]
`

// =============================================
// Sample project.godot content
// =============================================

export const SAMPLE_PROJECT_GODOT = `; Engine configuration file.
; It's best edited using the editor UI and not directly.

[application]

config/name="TestProject"
run/main_scene="res://scenes/main.tscn"
config/features=PackedStringArray("4.4", "GL Compatibility")

[display]

window/size/viewport_width=1280
window/size/viewport_height=720

[input]

move_left={"deadzone": 0.5, "events": [Object(InputEventKey,"keycode":65)]}
move_right={"deadzone": 0.5, "events": [Object(InputEventKey,"keycode":68)]}
jump={"deadzone": 0.5, "events": []}

[rendering]

renderer/rendering_method="gl_compatibility"
`

// =============================================
// Sample shader content
// =============================================

export const SAMPLE_SHADER = `shader_type canvas_item;

uniform vec4 tint_color : source_color = vec4(1.0, 1.0, 1.0, 1.0);
uniform float intensity = 0.5;
uniform sampler2D noise_tex : hint_default_white;

void fragment() {
\tCOLOR = texture(TEXTURE, UV) * tint_color * intensity;
}
`

// =============================================
// Sample audio bus layout
// =============================================

export const SAMPLE_BUS_LAYOUT = `[gd_resource type="AudioBusLayout" format=3]

[resource]
bus/1/name = "Music"
bus/1/solo = false
bus/1/mute = false
bus/2/name = "SFX"
bus/2/solo = false
bus/2/mute = false
`

// =============================================
// Factory Functions
// =============================================

/**
 * Create a temporary Godot project directory with project.godot.
 * Returns the project path and a cleanup function.
 */
export function createTmpProject(projectGodotContent = SAMPLE_PROJECT_GODOT): {
  projectPath: string
  cleanup: () => void
} {
  const projectPath = mkdtempSync(join(tmpdir(), 'godot-mcp-test-'))
  writeFileSync(join(projectPath, 'project.godot'), projectGodotContent, 'utf-8')

  return {
    projectPath,
    cleanup: () => rmSync(projectPath, { recursive: true, force: true }),
  }
}

/**
 * Create a scene file inside a project directory.
 */
export function createTmpScene(projectPath: string, scenePath: string, content = MINIMAL_TSCN): string {
  const fullPath = join(projectPath, scenePath)
  const dir = fullPath.replace(/[/\\][^/\\]*$/, '')
  mkdirSync(dir, { recursive: true })
  writeFileSync(fullPath, content, 'utf-8')
  return fullPath
}

/**
 * Create a GDScript file inside a project directory.
 */
export function createTmpScript(projectPath: string, scriptPath: string, content = 'extends Node\n'): string {
  const fullPath = join(projectPath, scriptPath)
  const dir = fullPath.replace(/[/\\][^/\\]*$/, '')
  mkdirSync(dir, { recursive: true })
  writeFileSync(fullPath, content, 'utf-8')
  return fullPath
}

/**
 * Create a GodotConfig for testing.
 */
export function makeConfig(overrides: Partial<GodotConfig> = {}): GodotConfig {
  return {
    godotPath: null,
    godotVersion: null,
    projectPath: null,
    ...overrides,
  }
}
