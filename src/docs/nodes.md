# Nodes Tool - Full Documentation

## Overview
Node operations within .tscn scene files.

## Actions

### add
Add a node to a scene.
```json
{"action": "add", "scene_path": "main.tscn", "name": "Player", "type": "CharacterBody2D", "parent": "."}
```

### remove
Remove a node from a scene.
```json
{"action": "remove", "scene_path": "main.tscn", "name": "OldNode"}
```

### rename
Rename a node in a scene.
```json
{"action": "rename", "scene_path": "main.tscn", "name": "OldName", "new_name": "NewName"}
```

### list
List all nodes in a scene.
```json
{"action": "list", "scene_path": "main.tscn"}
```

### set_property
Set a property on a node.
```json
{"action": "set_property", "scene_path": "main.tscn", "name": "Player", "property": "position", "value": "Vector2(100, 200)"}
```

### get_property
Get a property from a node.
```json
{"action": "get_property", "scene_path": "main.tscn", "name": "Player", "property": "position"}
```

## Parameters
- `scene_path` - Path to scene file (required)
- `name` - Node name (required for most actions)
- `type` - Node type (default: "Node", for add)
- `parent` - Parent node path (default: ".", for add)
- `new_name` - New name (for rename)
- `property` - Property name (for get/set_property)
- `value` - Property value as Godot expression (for set_property)
