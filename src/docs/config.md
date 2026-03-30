# Config Tool - Full Documentation

## Overview
Server configuration, environment detection, and verification.

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

### detect_godot
Find Godot binary on the system. Searches: GODOT_PATH env, PATH, common install locations.
```json
{"action": "detect_godot"}
```

### check
Check environment status: Godot binary, version, project path.
```json
{"action": "check"}
```

## Parameters
- `key` - Setting key: `project_path`, `godot_path`, `timeout` (for set)
- `value` - New value (for set)
