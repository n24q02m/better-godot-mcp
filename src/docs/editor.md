# Editor Tool - Full Documentation

## Overview
Godot Editor lifecycle: launch, status.

## Actions

### launch
Open Godot Editor with a project.
```json
{"action": "launch", "project_path": "/path/to/project"}
```
Launches Godot as a background process.

### status
Check if Godot Editor is currently running.
```json
{"action": "status"}
```

## Parameters
- `project_path` - Path to Godot project directory (optional, uses config default)
