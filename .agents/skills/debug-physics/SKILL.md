---
name: debug-physics
description: Systematic Godot physics debugging -- list bodies, check collisions, inspect properties, suggest fixes
argument-hint: "[scene or issue description]"
---

# Debug Physics

Systematically debug Godot physics issues using the MCP tools.

## Steps

1. **Identify the issue**: Ask user about symptoms (objects passing through, wrong collisions, etc.)

2. **Inspect scene** using `scenes` and `nodes` tools:
   - `scenes(action="get", scene="<scene>.tscn")` to see full node tree
   - List all physics bodies and collision shapes

3. **Check collision setup**:
   - Verify collision layers and masks: `nodes(action="get_property", ..., property="collision_layer")`
   - Verify collision shapes exist and are correctly sized
   - Check that CollisionShape2D/3D nodes are direct children of physics bodies

4. **Inspect physics properties**:
   - Body type (static, kinematic, rigid, character)
   - Gravity, mass, friction, bounce
   - Velocity and force application in scripts

5. **Run diagnostics** using `editor` tool:
   - `editor(action="run_scene", scene="<scene>.tscn")` to test
   - Check for runtime errors in output

6. **Suggest fixes**: Based on findings, recommend specific property changes or node restructuring.

## When to Use

- Objects not colliding when they should
- Objects passing through walls or floors
- Unexpected physics behavior (bouncing, sliding, etc.)
- Performance issues related to physics
