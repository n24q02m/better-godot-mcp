# Shader Tool

Godot shader (.gdshader) file management.

## Actions

### `create` - Create new shader file
- `shader_path` (required): Path for shader (e.g., "shaders/effect.gdshader")
- `shader_type` (optional): canvas_item, spatial, particles, sky, fog (default: canvas_item)
- `content` (optional): Custom shader code

### `read` - Read shader file contents
- `shader_path` (required): Path to shader file

### `write` - Write/overwrite shader content
- `shader_path` (required): Path to shader file
- `content` (required): Shader code to write

### `get_params` - Extract uniform parameters
- `shader_path` (required): Path to shader file
- Returns: shader type, uniform parameters (name, type, hint, default value)

### `list` - List all shader files in project
- `project_path` (required): Path to Godot project
- Returns: paths to .gdshader and .gdshaderinc files

## Shader Types

- **canvas_item**: 2D rendering (sprites, UI)
- **spatial**: 3D rendering (meshes, surfaces)
- **particles**: GPU particle effects
- **sky**: Sky/background rendering
- **fog**: Volumetric fog
