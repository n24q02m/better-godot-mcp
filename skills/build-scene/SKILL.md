---
name: build-scene
description: Pattern-based Godot scene construction with node hierarchy templates and companion node rules
argument-hint: "[scene type: platformer character, UI screen, projectile, etc.]"
---

# Build Scene

Construct Godot scenes from proven patterns. Each pattern includes REQUIRED companion nodes that LLMs commonly forget.

## Scene Patterns

### Platformer Character
```
CharacterBody2D "Player"
  CollisionShape2D          # REQUIRED -- CharacterBody2D without this = no collisions
  Sprite2D                  # Visual representation
  AnimationPlayer           # Idle, run, jump, fall animations
  Camera2D                  # Follow camera
    position_smoothing_enabled = true
    position_smoothing_speed = 5.0
```
Companion rule: `CharacterBody2D` MUST have a `CollisionShape2D` child. Without it, `move_and_slide()` works but detects zero collisions.

### Top-Down Character
```
CharacterBody2D "Player"
  CollisionShape2D          # REQUIRED
  Sprite2D
  NavigationAgent2D         # Pathfinding (if AI/NPC)
    path_desired_distance = 4.0
    target_desired_distance = 4.0
```

### UI Screen
```
Control "MenuScreen"
  MarginContainer           # Prevents content touching edges
    VBoxContainer           # Vertical layout for menu items
      Label "Title"
      Button "StartButton"
      Button "OptionsButton"
      Button "QuitButton"
```
Companion rule: Always wrap UI content in `MarginContainer` first. Direct children of `Control` have no automatic margins.

### Projectile
```
Area2D "Bullet"
  CollisionShape2D          # REQUIRED -- Area2D signals need this to detect overlaps
  Sprite2D
  VisibleOnScreenNotifier2D # Auto-cleanup when off-screen (connect screen_exited -> queue_free)
```
Companion rule: `Area2D` without `CollisionShape2D` will never emit `body_entered` or `area_entered` signals.

### Pickup Item
```
Area2D "Coin"
  CollisionShape2D          # REQUIRED
  Sprite2D
  AudioStreamPlayer         # Pickup sound effect
```

### Tilemap Level
```
Node2D "Level"
  TileMapLayer              # Godot 4.3+ (NOT TileMap -- deprecated)
  Camera2D
    limit_left = 0
    limit_top = 0
```
Note: `TileMap` node is deprecated in Godot 4.3+. Use `TileMapLayer` instead.

## Implementation Steps

1. **Identify pattern** from user description. Map to the closest template above.

2. **Create scene**:
   ```
   scenes(action="create", scene_path="scenes/<name>.tscn", root_type="<RootType>")
   ```

3. **Add nodes top-down** (parent before children):
   ```
   nodes(action="add", scene_path="scenes/<name>.tscn", parent=".", type="CollisionShape2D", name="CollisionShape2D")
   nodes(action="add", scene_path="scenes/<name>.tscn", parent=".", type="Sprite2D", name="Sprite2D")
   ```

4. **Configure properties**:
   ```
   nodes(action="set_property", scene_path="scenes/<name>.tscn", name="Camera2D",
         property="position_smoothing_enabled", value="true")
   ```

5. **Attach script** (create from template in add-mechanic skill if needed):
   ```
   scripts(action="create", script_path="res://scripts/<name>.gd", content="...")
   ```

6. **Verify scene tree**:
   ```
   scenes(action="info", scene_path="scenes/<name>.tscn")
   ```

## Common Mistakes to Prevent

- Missing `CollisionShape2D` on physics bodies/areas (most frequent LLM error)
- Using `TileMap` instead of `TileMapLayer` in Godot 4.3+
- Forgetting `Camera2D` smoothing (causes jarring camera movement)
- Putting UI elements directly under `Control` without layout containers
- Using `RigidBody2D` when `CharacterBody2D` is needed (characters need `move_and_slide`)

## When to Use

- Creating a new game entity (character, enemy, projectile, pickup)
- Setting up a UI screen (menu, HUD, dialog)
- Building a level structure
- Prototyping a scene with correct node hierarchy
