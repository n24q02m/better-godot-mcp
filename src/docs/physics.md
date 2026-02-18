# Physics Tool

Physics layer configuration and collision setup.

## Actions

### `layers` - Read physics layer names
- `project_path` (required): Path to Godot project
- Returns: named 2D and 3D physics layers

### `collision_setup` - Configure collision properties
- `scene_path` (required): Path to scene file
- `name` (required): Physics body node name
- `collision_layer` (optional): Collision layer bitmask
- `collision_mask` (optional): Collision mask bitmask

### `body_config` - Configure physics body properties
- `scene_path` (required): Path to scene file
- `name` (required): Physics body node name
- `gravity_scale` (optional): Gravity multiplier
- `mass` (optional): Body mass
- `linear_damp` (optional): Linear damping
- `angular_damp` (optional): Angular damping
- `freeze` (optional): Whether body is frozen

### `set_layer_name` - Name a physics layer
- `project_path` (required): Path to Godot project
- `dimension` (optional): 2d or 3d (default: 2d)
- `layer_number` (optional): Layer number (default: 1)
- `name` (required): Layer name

## Notes

- Collision layers define what an object IS
- Collision masks define what an object DETECTS
- Layer numbers are 1-32, stored as bitmask values
