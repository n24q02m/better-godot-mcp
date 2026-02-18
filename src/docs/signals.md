# Signals Tool

Manage signal connections in .tscn scene files.

## Actions

### `list` - List all signal connections
- `scene_path` (required): Path to scene file
- Returns: signal name, source node, target node, method, flags

### `connect` - Create signal connection
- `scene_path` (required): Path to scene file
- `signal` (required): Signal name (e.g., "pressed", "body_entered")
- `from` (required): Source node path
- `to` (required): Target node path
- `method` (required): Method name to call
- `flags` (optional): Connection flags

### `disconnect` - Remove signal connection
- `scene_path` (required): Path to scene file
- `signal` (required): Signal name
- `from` (required): Source node path
- `to` (required): Target node path
- `method` (required): Method name

## Notes

- Signal connections are stored as `[connection]` entries in .tscn files
- Node paths are relative to scene root
- Common signals: pressed (Button), body_entered (Area2D/3D), timeout (Timer)
