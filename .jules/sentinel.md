## 2026-03-24 - Unvalidated Editor Process Query via Shell Commands
**Vulnerability:** The `editor status` action used raw shell commands (`pgrep` and `tasklist`) through `execFile` to find Godot processes. It parsed the untrusted string output using regular expressions to extract PIDs.
**Learning:** Using system tools to globally query processes and manually parsing string output is brittle and exposes the system to potential injection or parsing bugs, especially if malicious process names are introduced or if regexes are loosely bounded.
**Prevention:** Instead of querying global system state via shell commands, track process lifecycles internally (e.g., `config.activePids`) when launched by the tool. To verify their existence, use safe OS-level APIs like `process.kill(pid, 0)`, which tests process existence synchronously without relying on parsing string output or shelling out to external commands.

## 2025-04-10 - Command Injection / Parameter Injection in Godot Export

**Vulnerability:** The `export` action in `src/tools/composite/project.ts` accepts `preset` and `output_path` parameters that are directly passed as arguments to the `execGodotAsync` function which ultimately invokes the Godot executable. Although `execFile` does not execute through a shell, passing parameters starting with `-` or `--` to a CLI binary can be interpreted as flags rather than positional arguments. This could lead to parameter injection where an attacker could pass an arbitrary flag to the Godot binary, e.g. `--script` followed by a path.

**Learning:** When executing a binary via `child_process.spawn` or `execFile`, arguments derived from user input must be sanitized to prevent parameter injection. Even if shell injection is avoided, the binary itself might misinterpret an argument starting with `-` as a flag rather than data.

**Prevention:** Ensure that string parameters that are intended to be values (such as `preset` or `output_path`) do not begin with `-`. If they do, reject the input or sanitize it.
