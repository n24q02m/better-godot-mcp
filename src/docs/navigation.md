# Navigation Tool

Navigation regions, agents, and obstacles for pathfinding.

## Actions

### `create_region` - Add NavigationRegion node
- `scene_path` (required): Path to scene file
- `name` (optional): Node name (default: NavigationRegion3D)
- `parent` (optional): Parent node path (default: .)
- `dimension` (optional): 2D or 3D (default: 3D)

### `add_agent` - Add NavigationAgent node
- `scene_path` (required): Path to scene file
- `name` (optional): Node name (default: NavigationAgent3D)
- `parent` (optional): Parent node path (default: .)
- `dimension` (optional): 2D or 3D (default: 3D)
- `radius` (optional): Agent radius
- `max_speed` (optional): Maximum speed
- `path_desired_distance` (optional): Path following distance
- `target_desired_distance` (optional): Target reached distance

### `add_obstacle` - Add NavigationObstacle node
- `scene_path` (required): Path to scene file
- `name` (optional): Node name (default: NavigationObstacle3D)
- `parent` (optional): Parent node path (default: .)
- `dimension` (optional): 2D or 3D (default: 3D)
- `radius` (optional): Obstacle radius
- `avoidance_enabled` (optional): Enable avoidance

## Notes

- NavigationRegion holds the NavigationMesh/Polygon
- NavigationAgent handles pathfinding for characters
- NavigationObstacle marks areas to avoid
- Bake navigation mesh in the Godot editor for best results
