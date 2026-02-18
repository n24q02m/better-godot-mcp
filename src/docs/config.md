# Config Tool - Full Documentation

## Overview
Runtime server configuration management.

## Actions

### status
Show current server configuration (Godot path, version, project path).
```json
{"action": "status"}
```

### set
Change a runtime setting.
```json
{"action": "set", "key": "project_path", "value": "/path/to/project"}
```

## Parameters
- `key` - Setting key: `project_path`, `godot_path`, `timeout` (for set)
- `value` - New value (for set)
