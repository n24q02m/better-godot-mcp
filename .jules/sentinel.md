## 2025-05-14 - [Security] Unified newline validation in audio tool
**Vulnerability:** Potential injection attacks if user input contains newlines in Godot text files.
**Learning:** Using `validateNoNewlines` helper ensures consistent security checks across all audio actions that modify project files.
**Prevention:** Integrated `validateNoNewlines` in `handleAddBus`, `handleAddEffect`, and `handleCreateStream`.
