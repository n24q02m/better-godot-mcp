---
name: create-scene
description: Guided Godot scene creation -- create scene, add nodes, configure properties, save
argument-hint: "[scene name or type]"
---

# Create Scene

Guide through creating a Godot scene with proper node hierarchy and configuration.

## Steps

1. **Plan scene structure**:
   - Ask user what type of scene (2D, 3D, UI, level, character, etc.)
   - Determine root node type (Node2D, Node3D, Control, etc.)
   - Plan child node hierarchy

2. **Create scene** using the `scenes` tool:
   - `scenes(action="create", name="<scene_name>", root_type="<Node2D|Node3D|Control>")`

3. **Add nodes** using the `nodes` tool:
   - `nodes(action="add", scene="<scene>.tscn", parent=".", type="<NodeType>", name="<name>")`
   - Build hierarchy top-down (parent before children)
   - Common patterns:
     - Character: CharacterBody2D -> CollisionShape2D + Sprite2D + AnimationPlayer
     - UI: Control -> VBoxContainer -> Label + Button
     - Level: Node2D -> TileMap + Camera2D

4. **Configure properties** using the `nodes` tool:
   - `nodes(action="set_property", scene="<scene>.tscn", node_path="<path>", property="<name>", value="<value>")`
   - Set transforms, collision shapes, textures, etc.

5. **Attach scripts** using the `scripts` tool:
   - `scripts(action="create", path="res://scripts/<name>.gd", content="...")`
   - `nodes(action="set_property", ..., property="script", value="res://scripts/<name>.gd")`

6. **Verify**: `scenes(action="get", scene="<scene>.tscn")` to review the final scene tree.

## When to Use

- Creating new game scenes from scratch
- Setting up common scene patterns (character, UI, level)
- Prototyping game elements quickly
