# Project Tool - Full Documentation

## Overview
Project lifecycle management: info, settings, run, stop.

## Actions

### info
Get project configuration from `project.godot`.
```json
{"action": "info", "project_path": "/path/to/godot/project"}
```

### version
Get installed Godot Engine version.
```json
{"action": "version"}
```

### run
Run the Godot project.
```json
{"action": "run", "project_path": "/path/to/godot/project"}
```

### stop
Stop all running Godot instances.
```json
{"action": "stop"}
```

### settings_get
Read a setting from `project.godot`.
```json
{"action": "settings_get", "key": "application/config/name"}
```

### settings_set
Write a setting to `project.godot`.
```json
{"action": "settings_set", "key": "application/config/name", "value": "My Game"}
```

### export
Export the project using a preset.
```json
{"action": "export", "preset": "Windows Desktop", "output_path": "builds/game.exe"}
```

## Parameters
- `project_path` - Path to Godot project directory (optional, uses config default)
- `key` - Settings key in section/key format (for settings_get/set)
- `value` - Settings value (for settings_set)
- `preset` - Export preset name (for export)
- `output_path` - Export output path (for export)
