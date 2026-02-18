# Audio Tool

Audio bus layout and stream player management.

## Actions

### `list_buses` - List audio buses
- `project_path` (required): Path to Godot project
- Returns: bus names and metadata from default_bus_layout.tres

### `add_bus` - Add new audio bus
- `bus_name` (required): Name for the new bus
- `send_to` (optional): Parent bus (default: Master)

### `add_effect` - Effect guidance
- `bus_name` (required): Target bus
- `effect_type` (required): Effect class name
- Returns guidance for adding effects to bus layout

### `create_stream` - Add AudioStreamPlayer node
- `scene_path` (required): Path to scene file
- `name` (optional): Node name (default: AudioStreamPlayer)
- `stream_type` (optional): 2D, 3D, or global (default: 2D)
- `parent` (optional): Parent node path (default: .)
- `bus` (optional): Audio bus (default: Master)

## Common Effects

- AudioEffectReverb - Room reverb
- AudioEffectCompressor - Dynamic range compression
- AudioEffectLimiter - Peak limiting
- AudioEffectEQ - Equalizer
- AudioEffectChorus - Chorus effect
- AudioEffectDelay - Echo/delay
