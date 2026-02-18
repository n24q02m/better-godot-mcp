# Scenes Tool - Full Documentation

## Overview
Scene file (.tscn) management: create, list, info, delete, duplicate.

## Actions

### create
Create a new .tscn scene file.
```json
{"action": "create", "scene_path": "scenes/main.tscn", "root_type": "Node2D", "root_name": "Main"}
```

### list
List all .tscn files in the project.
```json
{"action": "list", "project_path": "/path/to/project"}
```

### info
Parse a .tscn file and return its node tree structure.
```json
{"action": "info", "scene_path": "scenes/main.tscn"}
```

### delete
Delete a scene file.
```json
{"action": "delete", "scene_path": "scenes/old.tscn"}
```

### duplicate
Duplicate a scene file.
```json
{"action": "duplicate", "scene_path": "scenes/player.tscn", "new_path": "scenes/enemy.tscn"}
```

### set_main
Set a scene as the main scene in project.godot.
```json
{"action": "set_main", "scene_path": "scenes/main.tscn"}
```

## Parameters
- `scene_path` - Relative path to scene file (required for most actions)
- `root_type` - Root node type (default: "Node2D", for create)
- `root_name` - Root node name (optional, for create)
- `new_path` - Destination path (for duplicate)
- `project_path` - Project directory (optional)
