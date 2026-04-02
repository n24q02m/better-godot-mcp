## 2026-03-24 - Unvalidated Editor Process Query via Shell Commands
**Vulnerability:** The `editor status` action used raw shell commands (`pgrep` and `tasklist`) through `execFile` to find Godot processes. It parsed the untrusted string output using regular expressions to extract PIDs.
**Learning:** Using system tools to globally query processes and manually parsing string output is brittle and exposes the system to potential injection or parsing bugs, especially if malicious process names are introduced or if regexes are loosely bounded.
**Prevention:** Instead of querying global system state via shell commands, track process lifecycles internally (e.g., `config.activePids`) when launched by the tool. To verify their existence, use safe OS-level APIs like `process.kill(pid, 0)`, which tests process existence synchronously without relying on parsing string output or shelling out to external commands.
## 2026-04-02 - [CLEANUP] Unused Function: execGodotScript
**Vulnerability:** Code bloat/maintenance overhead.
**Learning:**  was a thin wrapper over  that constructed specific Godot arguments for headless script execution, but it was not used anywhere in the codebase (except in some documentation/plans and its own tests).
**Prevention:** Regularly audit exports and remove unused functions to keep the codebase lean and reduce the surface area for bugs and security issues.
## 2026-04-02 - [CLEANUP] Unused Function: execGodotScript
**Vulnerability:** Maintenance overhead.
**Learning:** Unused internal helpers can be safely removed to simplify the codebase.
**Prevention:** Regular code cleanup.
