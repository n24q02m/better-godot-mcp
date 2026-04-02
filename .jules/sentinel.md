## 2026-03-24 - Unvalidated Editor Process Query via Shell Commands
**Vulnerability:** The `editor status` action used raw shell commands (`pgrep` and `tasklist`) through `execFile` to find Godot processes. It parsed the untrusted string output using regular expressions to extract PIDs.
**Learning:** Using system tools to globally query processes and manually parsing string output is brittle and exposes the system to potential injection or parsing bugs, especially if malicious process names are introduced or if regexes are loosely bounded.
**Prevention:** Instead of querying global system state via shell commands, track process lifecycles internally (e.g., `config.activePids`) when launched by the tool. To verify their existence, use safe OS-level APIs like `process.kill(pid, 0)`, which tests process existence synchronously without relying on parsing string output or shelling out to external commands.
## 2025-05-15 - Arbitrary Binary Execution via godot_path Configuration
**Vulnerability:** The `godot_path` configuration setting allowed users to specify any arbitrary binary to be executed by the MCP server, with only basic shell metacharacter filtering.
**Learning:** Shell metacharacter filtering is insufficient when the application logic itself involves executing the provided path as a command.
**Prevention:** Always perform strict validation on paths that will be executed. Verify the file is an executable, check its identity (e.g., version check), and ensure it meets minimum requirements.
