# Godot Asset Store media

These files are upload-ready media for the **Media** section of the official Godot Asset Store.
They stay outside `addons/better_godot_mcp/`, so the addon ZIP remains code-only. The adjacent
`.gdignore` prevents Godot from importing these repository media files when the repository is
opened as a project.

## Upload mapping

- `thumbnail.png` — 1280x720 (16:9), showing the Better Godot MCP dock connected to a local
  Streamable HTTP server.
- `screenshot-project-info.png` — 1280x720 (16:9), showing a successful MCP `tools/call` for
  `project/info` and the returned project metadata.

Both images were captured by Godot's built-in screenshot command in official Godot 4.7.1 stable.
The dock was connected to Better Godot MCP v1.22.0 from the current source checkout and used a
neutral local demo project. The screenshots are not mockups and contain no credentials, private
repository paths, or personal user paths.

Upload these files from the Asset Store management form under **Media**. A featured image and
video are optional and are intentionally not provided. The form's AI-usage disclosure remains an
owner-completed field; this repository does not infer or preselect that declaration.
