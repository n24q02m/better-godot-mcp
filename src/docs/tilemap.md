# TileMap Tool

TileSet resource and TileMapLayer node management.

## Actions

### `create_tileset` - Create new TileSet .tres resource
- `tileset_path` (required): Path for TileSet (e.g., "tilesets/main.tres")
- `tile_size` (optional): Tile size in pixels (default: 16)

### `add_source` - Add texture source to TileSet
- `tileset_path` (required): Path to TileSet .tres file
- `texture_path` (required): Path to texture image

### `set_tile` - Tile configuration guidance
Returns format guidance for tile setup.

### `paint` - Tile painting guidance
Returns guidance for procedural tile placement via GDScript.

### `list` - List TileMapLayer nodes in scene
- `scene_path` (required): Path to scene file
- Returns: TileMapLayer node names

## Notes

- Godot 4.x uses TileMapLayer instead of TileMap
- Complex tile configurations (auto-tiling, terrain) are best done in the editor
- Use GDScript for runtime tile placement with set_cell()
