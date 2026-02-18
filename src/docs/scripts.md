# Scripts Tool - Full Documentation

## Overview
GDScript file management: create, read, write, attach, list, delete.

## Actions

### create
Create a new GDScript file with template.
```json
{"action": "create", "script_path": "scripts/player.gd", "extends": "CharacterBody2D"}
```

### read
Read a GDScript file.
```json
{"action": "read", "script_path": "scripts/player.gd"}
```

### write
Write content to a GDScript file.
```json
{"action": "write", "script_path": "scripts/player.gd", "content": "extends Node2D\n\nfunc _ready():\n\tpass"}
```

### attach
Attach a script to a node in a scene.
```json
{"action": "attach", "scene_path": "main.tscn", "script_path": "scripts/player.gd", "node_name": "Player"}
```

### list
List all .gd script files in the project.
```json
{"action": "list", "project_path": "/path/to/project"}
```

### delete
Delete a script file.
```json
{"action": "delete", "script_path": "scripts/old.gd"}
```

## Parameters
- `script_path` - Path to GDScript file (required for most actions)
- `extends` - Base class (default: "Node", for create)
- `content` - Script content (for write, optional for create)
- `scene_path` - Scene file path (for attach)
- `node_name` - Target node name (default: root, for attach)
- `project_path` - Project directory (optional, for list)
