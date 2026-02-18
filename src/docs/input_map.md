# Input Map Tool

Manage input actions and key bindings in project.godot.

## Actions

### `list` - List all input actions
- `project_path` (required): Path to Godot project
- Returns: action names and event counts

### `add_action` - Add new input action
- `action_name` (required): Action name (e.g., "move_left")
- `deadzone` (optional): Deadzone value (default: 0.5)

### `remove_action` - Remove input action
- `action_name` (required): Action name to remove

### `add_event` - Add event to existing action
- `action_name` (required): Target action
- `event_type` (required): key, mouse, or joypad
- `event_value` (required): Key constant (e.g., KEY_SPACE), button index, etc.

## Notes

- Actions are stored in the `[input]` section of project.godot
- Use Godot key constants for event_value (e.g., KEY_W, KEY_SPACE, KEY_ESCAPE)
- Mouse button indices: 1=left, 2=right, 3=middle
