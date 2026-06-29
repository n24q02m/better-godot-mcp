## 2025-05-14 - [SECURITY] Command Injection Risk in runGodotProject
**Vulnerability:** Path-related arguments (godotPath, projectPath, scenePath) were passed directly to spawn/execFile without validation. An attacker could provide a path starting with a hyphen (e.g., "--invalid-flag") to inject arbitrary flags into the Godot CLI.
**Learning:** Even when using array-based arguments in Node.js spawn/execFile, the first element after the command (or the command itself) can be interpreted as a flag if it starts with a hyphen.
**Prevention:** Strictly validate that any path-related string passed to external processes does not start with a hyphen after trimming.
