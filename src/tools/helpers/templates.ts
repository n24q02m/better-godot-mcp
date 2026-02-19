/**
 * Default GDScript templates for new scripts
 */

export const SCRIPT_TEMPLATES: Record<string, string> = {
  Node: `extends Node


func _ready() -> void:
\tpass


func _process(delta: float) -> void:
\tpass
`,
  Node2D: `extends Node2D


func _ready() -> void:
\tpass


func _process(delta: float) -> void:
\tpass
`,
  Node3D: `extends Node3D


func _ready() -> void:
\tpass


func _process(delta: float) -> void:
\tpass
`,
  CharacterBody2D: `extends CharacterBody2D

const SPEED = 300.0
const JUMP_VELOCITY = -400.0


func _physics_process(delta: float) -> void:
\tif not is_on_floor():
\t\tvelocity += get_gravity() * delta

\tif Input.is_action_just_pressed("ui_accept") and is_on_floor():
\t\tvelocity.y = JUMP_VELOCITY

\tvar direction := Input.get_axis("ui_left", "ui_right")
\tif direction:
\t\tvelocity.x = direction * SPEED
\telse:
\t\tvelocity.x = move_toward(velocity.x, 0, SPEED)

\tmove_and_slide()
`,
  CharacterBody3D: `extends CharacterBody3D

const SPEED = 5.0
const JUMP_VELOCITY = 4.5


func _physics_process(delta: float) -> void:
\tif not is_on_floor():
\t\tvelocity += get_gravity() * delta

\tif Input.is_action_just_pressed("ui_accept") and is_on_floor():
\t\tvelocity.y = JUMP_VELOCITY

\tvar input_dir := Input.get_vector("ui_left", "ui_right", "ui_up", "ui_down")
\tvar direction := (transform.basis * Vector3(input_dir.x, 0, input_dir.y)).normalized()
\tif direction:
\t\tvelocity.x = direction.x * SPEED
\t\tvelocity.z = direction.z * SPEED
\telse:
\t\tvelocity.x = move_toward(velocity.x, 0, SPEED)
\t\tvelocity.z = move_toward(velocity.z, 0, SPEED)

\tmove_and_slide()
`,
  Control: `extends Control


func _ready() -> void:
\tpass
`,
}

export function getTemplate(extendsType: string): string {
  return SCRIPT_TEMPLATES[extendsType] || `extends ${extendsType}\n\n\nfunc _ready() -> void:\n\tpass\n`
}
