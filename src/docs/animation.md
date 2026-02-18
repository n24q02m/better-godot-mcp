# Animation Tool

AnimationPlayer and animation resource management.

## Actions

### `create_player` - Add AnimationPlayer node
- `scene_path` (required): Path to scene file
- `name` (optional): Node name (default: AnimationPlayer)
- `parent` (optional): Parent node path (default: .)

### `add_animation` - Create animation resource
- `scene_path` (required): Path to scene file
- `anim_name` (required): Animation name
- `duration` (optional): Duration in seconds (default: 1.0)
- `loop` (optional): Whether to loop (default: true)

### `add_track` - Add property track to animation
- `scene_path` (required): Path to scene file
- `anim_name` (required): Target animation
- `node_path` (required): Node path to animate
- `property` (required): Property to animate
- `track_type` (optional): value, method, bezier (default: value)

### `add_keyframe` - Keyframe guidance
Returns format guidance for adding keyframes manually.

### `list` - List animations and players
- `scene_path` (required): Path to scene file
- Returns: AnimationPlayer nodes and Animation resources with metadata
