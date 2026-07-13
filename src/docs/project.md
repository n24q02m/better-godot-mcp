# Project Tool - Full Documentation

## Overview
Project lifecycle management: info, settings, run, logs, stop.

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
Run the Godot project. stdout/stderr are captured into a 400-line ring buffer per PID -- use `logs` to read them.
```json
{"action": "run", "project_path": "/path/to/godot/project"}
```

### logs
Read the last captured stdout/stderr lines from a run started with `run`. Works right after a crash too (logs for
the last 10 exited processes are kept). Defaults to the most recently started PID if `pid` is omitted.
```json
{"action": "logs"}
{"action": "logs", "pid": 12345}
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
- `pid` - PID to read logs for (for logs; optional, defaults to the most recently started PID)
- `key` - Settings key in section/key format (for settings_get/set)
- `value` - Settings value (for settings_set)
- `preset` - Export preset name (for export)
- `output_path` - Export output path (for export)
