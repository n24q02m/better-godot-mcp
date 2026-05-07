---
name: add-mechanic
description: Add game mechanics with correct GDScript 4.x patterns -- movement, health, inventory, save/load
argument-hint: "[mechanic type: movement, health, inventory, save/load]"
---

# Add Mechanic

Add game mechanics using correct GDScript 4.x syntax. Prevents common LLM mistakes with outdated GDScript 3.x patterns.

## GDScript 4.x Syntax Rules

These changed from Godot 3 to 4. LLMs frequently generate the OLD syntax:

| Correct (GDScript 4.x) | Wrong (GDScript 3.x -- will error) |
|---|---|
| `@export var speed: float = 200.0` | `export var speed = 200.0` |
| `@onready var sprite = $Sprite2D` | `onready var sprite = $Sprite2D` |
| `signal health_changed(new_hp: int)` | `signal health_changed` (no typed params) |
| `func _ready() -> void:` | `func _ready():` (return type optional but preferred) |
| `velocity = Vector2(...)` then `move_and_slide()` | `move_and_slide(velocity, Vector2.UP)` (args removed in 4.x) |
| `super()` | `.method()` for parent calls |
| `await get_tree().create_timer(1.0).timeout` | `yield(get_tree().create_timer(1.0), "timeout")` |
| `%UniqueNode` | `get_node("path/to/node")` when unique name is set |

## Movement Patterns

### Platformer Movement
```gdscript
extends CharacterBody2D

@export var speed: float = 300.0
@export var jump_velocity: float = -400.0
@export var gravity: float = 980.0

func _physics_process(delta: float) -> void:
    # Gravity
    if not is_on_floor():
        velocity.y += gravity * delta

    # Jump
    if Input.is_action_just_pressed("jump") and is_on_floor():
        velocity.y = jump_velocity

    # Horizontal movement
    var direction := Input.get_axis("move_left", "move_right")
    velocity.x = direction * speed

    move_and_slide()
```
Key: `move_and_slide()` takes NO arguments in Godot 4. Velocity is set on the `velocity` property directly.

### Top-Down Movement
```gdscript
extends CharacterBody2D

@export var speed: float = 200.0

func _physics_process(_delta: float) -> void:
    var direction := Input.get_vector("move_left", "move_right", "move_up", "move_down")
    velocity = direction * speed
    move_and_slide()
```

### Point-and-Click Movement
```gdscript
extends CharacterBody2D

@export var speed: float = 200.0
var target_position: Vector2

func _input(event: InputEvent) -> void:
    if event is InputEventMouseButton and event.pressed:
        target_position = get_global_mouse_position()

func _physics_process(_delta: float) -> void:
    if position.distance_to(target_position) > 5.0:
        velocity = position.direction_to(target_position) * speed
    else:
        velocity = Vector2.ZERO
    move_and_slide()
```

## Health/Damage System

```gdscript
extends Node
class_name HealthComponent

signal health_changed(new_hp: int, max_hp: int)
signal died

@export var max_hp: int = 100
var current_hp: int

func _ready() -> void:
    current_hp = max_hp

func take_damage(amount: int) -> void:
    current_hp = maxi(current_hp - amount, 0)
    health_changed.emit(current_hp, max_hp)
    if current_hp <= 0:
        died.emit()

func heal(amount: int) -> void:
    current_hp = mini(current_hp + amount, max_hp)
    health_changed.emit(current_hp, max_hp)
```

Usage: Add as child node of any entity. Connect `died` signal to handle death logic.
Pattern: Component node (not inheritance) -- allows reuse on Player, Enemy, Destructible, etc.

## Inventory System

```gdscript
extends Node
class_name Inventory

signal item_added(item: ItemResource)
signal item_removed(item: ItemResource)

@export var max_slots: int = 20
var items: Array[ItemResource] = []

func add_item(item: ItemResource) -> bool:
    if items.size() >= max_slots:
        return false
    items.append(item)
    item_added.emit(item)
    return true

func remove_item(item: ItemResource) -> void:
    items.erase(item)
    item_removed.emit(item)

func has_item(item_name: String) -> bool:
    return items.any(func(i: ItemResource) -> bool: return i.name == item_name)
```

Item resource:
```gdscript
extends Resource
class_name ItemResource

@export var name: String
@export var description: String
@export var icon: Texture2D
@export var stackable: bool = false
@export var max_stack: int = 1
```

Use `Resource` (not Node) for items -- they are data, not scene objects.

## Save/Load System

### ConfigFile (simple key-value)
```gdscript
extends Node

const SAVE_PATH := "user://save_data.cfg"

func save_game() -> void:
    var config := ConfigFile.new()
    config.set_value("player", "position", player.global_position)
    config.set_value("player", "health", player.health)
    config.set_value("game", "level", current_level)
    config.save(SAVE_PATH)

func load_game() -> void:
    var config := ConfigFile.new()
    if config.load(SAVE_PATH) != OK:
        return  # No save file
    player.global_position = config.get_value("player", "position", Vector2.ZERO)
    player.health = config.get_value("player", "health", 100)
    current_level = config.get_value("game", "level", 1)
```

### JSON (complex/nested data)
```gdscript
func save_game_json() -> void:
    var data := {
        "player": { "x": player.global_position.x, "y": player.global_position.y, "hp": player.health },
        "inventory": items.map(func(i: ItemResource) -> String: return i.name),
        "timestamp": Time.get_datetime_string_from_system()
    }
    var file := FileAccess.open("user://save.json", FileAccess.WRITE)
    file.store_string(JSON.stringify(data, "\t"))

func load_game_json() -> void:
    if not FileAccess.file_exists("user://save.json"):
        return
    var file := FileAccess.open("user://save.json", FileAccess.READ)
    var data: Dictionary = JSON.parse_string(file.get_as_text())
    player.global_position = Vector2(data.player.x, data.player.y)
```

Use `user://` path (NOT `res://`) for save files -- `res://` is read-only in exported games.

## Implementation Steps

1. **Identify mechanic** from user description
2. **Create script** using the appropriate template above:
   ```
   scripts(action="create", script_path="res://scripts/<name>.gd", content="...")
   ```
3. **Attach to scene node** if needed:
   ```
   nodes(action="set_property", scene_path="<scene>.tscn", name="<node>", property="script", value="res://scripts/<name>.gd")
   ```
4. **Add companion nodes** (e.g., HealthComponent as child node)
5. **Connect signals** in the scene or via script
6. **Test**: `project(action="run", scene_path="<scene>.tscn")`

## When to Use

- Adding player movement to a character scene
- Implementing health/damage for any entity
- Setting up an inventory system
- Adding save/load functionality
- Any gameplay mechanic that needs correct GDScript 4.x patterns
