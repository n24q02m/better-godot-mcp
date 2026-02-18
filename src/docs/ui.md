# UI Tool

UI Control nodes and theme management.

## Actions

### `create_control` - Add Control node to scene
- `scene_path` (required): Path to scene file
- `name` (required): Control node name
- `type` (optional): Control type (default: Control)
- `parent` (optional): Parent node path (default: .)
- `properties` (optional): Additional properties as key-value pairs

### `set_theme` - Create/update theme resource
- `theme_path` (required): Path for .tres theme file
- `font_size` (optional): Default font size (default: 16)

### `layout` - Apply layout preset to node
- `scene_path` (required): Path to scene file
- `name` (required): Node name
- `preset` (required): Layout preset name

### `list_controls` - List Control nodes in scene
- `scene_path` (required): Path to scene file
- Returns: Control node names, types, and parent references

## Layout Presets

- **full_rect**: Fill entire parent
- **center**: Center in parent
- **top_wide**: Anchor to top, full width
- **bottom_wide**: Anchor to bottom, full width
- **left_wide**: Anchor to left, full height
- **right_wide**: Anchor to right, full height

## Supported Control Types

Button, Label, LineEdit, TextEdit, ProgressBar, HSlider, CheckBox,
OptionButton, SpinBox, TextureRect, Panel, TabContainer, ScrollContainer,
MarginContainer, HBoxContainer, VBoxContainer, GridContainer, and more.
