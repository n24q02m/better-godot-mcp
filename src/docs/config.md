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

### setup_status
Check whether setup is required. Always returns `needs_setup: false` — godot-mcp has no credentials.
```json
{"action": "setup_status"}
```

### setup_start
Begin setup flow. No-op: godot-mcp requires no credentials.
```json
{"action": "setup_start"}
```

### setup_reset
Reset setup state. No-op: nothing to reset.
```json
{"action": "setup_reset"}
```

### setup_complete
Mark setup as complete. No-op: already complete by default.
```json
{"action": "setup_complete"}
```

### setup_skip
Skip setup. No-op: nothing to skip.
```json
{"action": "setup_skip"}
```

## Parameters
- `key` - Setting key: `project_path`, `godot_path`, `timeout` (for set)
- `value` - New value (for set)
