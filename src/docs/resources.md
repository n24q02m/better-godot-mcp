# Resources Tool

Manage resource files in the Godot project (images, audio, fonts, shaders, .tres).

## Actions

### `list` - List all resources
- `project_path` (required): Path to Godot project
- `type` (optional): Filter by type - image, audio, font, shader, scene, resource

### `info` - Resource file details
- `resource_path` (required): Path to resource file
- Returns: path, extension, size, modified date, type metadata for .tres files

### `delete` - Delete a resource file
- `resource_path` (required): Path to resource file
- Also removes .import file if present

### `import_config` - Read .import file
- `resource_path` (required): Path to original resource file
- Returns: Import configuration from corresponding .import file
