---
name: debug-issue
description: Systematic Godot debugging decision trees for physics, signals, rendering, navigation, and input issues
argument-hint: "[symptom description]"
---

# Debug Issue

Systematic debugging using domain-specific decision trees. Start by identifying the symptom category, then follow the corresponding tree.

## Category Detection

Map user's symptom to the right tree:

| Symptom keywords | Category |
|---|---|
| "pass through", "no collision", "overlap", "stuck", "slides off" | Physics |
| "signal not firing", "not connected", "callback not called" | Signals |
| "invisible", "not showing", "behind", "flickering", "wrong color" | Rendering |
| "not moving to target", "path wrong", "stuck on nav", "no path" | Navigation |
| "key not working", "input ignored", "wrong button", "double input" | Input |

## Physics Decision Tree

Check in this order -- each step is the most common cause at that point:

1. **Collision layer/mask mismatch** (most common):
   ```
   nodes(action="get_property", scene_path="<scene>.tscn", name="<body>", property="collision_layer")
   nodes(action="get_property", scene_path="<scene>.tscn", name="<body>", property="collision_mask")
   ```
   Rule: Object A detects Object B only if A's `collision_mask` has a bit that matches B's `collision_layer`. Both must be set correctly.

2. **Missing CollisionShape2D/3D**:
   ```
   scenes(action="info", scene_path="<scene>.tscn")
   ```
   Verify every physics body and Area has a CollisionShape child. A body without a shape = invisible to physics.

3. **Wrong body type**:
   - `StaticBody2D`: immovable (walls, floors)
   - `CharacterBody2D`: player/NPC movement via `move_and_slide()`
   - `RigidBody2D`: physics-driven (projectiles, debris)
   - Common mistake: using `RigidBody2D` for a player character, then fighting the physics engine

4. **Script velocity issues**:
   - Check if `velocity` is being set before `move_and_slide()`
   - Check if gravity is applied in `_physics_process` (not `_process`)
   - Check if `delta` is used for frame-independent movement

## Signals Decision Tree

1. **Connection exists?**
   - Check scene file for `[connection]` entries
   - Or check script for `connect()` calls
   - Debug: Print `is_connected("signal_name", callable)` in `_ready()`
   - Missing connection = signal silently does nothing

2. **Signal blocked?**
   - Check `set_block_signals(true)` or `Object.block_signals` property
   - If blocked, no signals will be emitted from that object

3. **Signature match?**
   - Signal definition parameters must match handler function parameters
   - `signal health_changed(new_hp: int)` requires handler `func _on_health_changed(new_hp: int)`
   - Extra or missing parameters = Godot error at runtime

4. **Signal emitted?**
   - Add `print("signal emitted")` before `signal_name.emit()`
   - If not printed, the emit call is never reached (logic bug)
   - In Godot 4, prefer `signal_name.emit()` over `emit_signal("signal_name")`

5. **Callable valid?**
   - If connected via code: target node must exist when `connect()` runs
   - If target is freed, signal emits to invalid callable = error

## Rendering Decision Tree

1. **Visibility**:
   - `visible` property = false? Check node and ALL parents (parent invisible = children invisible)
   - `modulate.a` = 0? (fully transparent)

2. **Z-index**:
   - Lower z-index renders behind higher z-index
   - `z_as_relative` = true means z_index is relative to parent
   - Sprite behind a TileMapLayer? Check z_index values on both

3. **Material/shader**:
   - CanvasItemMaterial or ShaderMaterial overriding appearance?
   - Shader compilation errors make object invisible (check Output panel)

4. **Viewport issues**:
   - SubViewport not updating? Check `render_target_update_mode`
   - Camera2D not active? Only one Camera2D should have `enabled = true` per viewport

## Navigation Decision Tree

1. **NavigationRegion setup**:
   - `NavigationRegion2D`/`3D` must exist in scene
   - Must have a `NavigationPolygon`/`NavigationMesh` resource assigned

2. **Navigation mesh baked?**
   - Mesh must be baked (either in editor or via `bake_navigation_mesh()`)
   - Unbaked mesh = no paths available

3. **NavigationAgent config**:
   - `path_desired_distance`: how close before moving to next path point
   - `target_desired_distance`: how close to target before stopping
   - Values too small = agent oscillates; too large = imprecise

4. **Path calculation**:
   - Call `NavigationAgent.set_target_position()` then check `get_next_path_position()`
   - If returns current position, no valid path exists (check mesh coverage)

## Input Decision Tree

1. **Input Map**:
   - Action defined in Project Settings > Input Map?
   - Check `project.godot` for `[input]` section

2. **Action name match**:
   - `Input.is_action_pressed("jump")` -- exact string match required
   - Typo in action name = silently returns false (no error!)

3. **Event processing**:
   - `_input()` vs `_unhandled_input()` -- if another node consumes the event, `_unhandled_input` never fires
   - `set_process_input(false)` disables `_input()` on that node

4. **Conflicts**:
   - Two actions on same key = both fire
   - UI elements (Button, LineEdit) consume input events before game nodes

## Diagnostic Steps

For any category:

1. **Inspect the scene tree**: `scenes(action="info", scene_path="<scene>.tscn")`
2. **Read relevant scripts**: `scripts(action="read", script_path="scripts/<name>.gd")`
3. **Check properties**: `nodes(action="get_property", scene_path="<scene>.tscn", name="<node>", property="<prop>")`
4. **Run the game**: `project(action="run")` and check output for errors
5. **Report findings**: present root cause and specific fix (property change, missing node, script edit)

## When to Use

- Any "it doesn't work" debugging scenario in Godot
- Systematic elimination when the cause is not obvious
- Verifying correct setup of physics, signals, rendering, navigation, or input
