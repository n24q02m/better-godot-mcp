## 2025-05-22 - [Robust Node Path Validation]
**Vulnerability:** Inconsistent node path handling can lead to incorrect scene modifications or bypasses in logic that expects relative paths.
**Learning:** Normalizing user-provided node paths at the edge (tool handlers) prevents issues where paths like "/root/SceneName/Node" might not match expected patterns.
**Prevention:** Always use `normalizeNodePath` for any user-provided string that represents a node path within a scene.
