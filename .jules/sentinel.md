## 2026-03-24 - Unvalidated Editor Process Query via Shell Commands
**Vulnerability:** The `editor status` action used raw shell commands (`pgrep` and `tasklist`) through `execFile` to find Godot processes. It parsed the untrusted string output using regular expressions to extract PIDs.
**Learning:** Using system tools to globally query processes and manually parsing string output is brittle and exposes the system to potential injection or parsing bugs, especially if malicious process names are introduced or if regexes are loosely bounded.
**Prevention:** Instead of querying global system state via shell commands, track process lifecycles internally (e.g., `config.activePids`) when launched by the tool. To verify their existence, use safe OS-level APIs like `process.kill(pid, 0)`, which tests process existence synchronously without relying on parsing string output or shelling out to external commands.

## 2026-04-12 - Godot CLI Argument Injection via Export Parameters
**Vulnerability:** The `export` action in `src/tools/composite/project.ts` passed the user-provided `preset` and `output_path` parameters directly to `execGodotAsync` without checking for leading hyphens. This allowed argument injection, where an attacker could provide a value like `--script=malicious.gd` to execute arbitrary code within the Godot project context.
**Learning:** Even when using a safe array-based execution function like `execFile`, arguments passed to command-line utilities can still be parsed as arbitrary operational flags if they start with hyphens.
**Prevention:** Validate user inputs passed to CLI utilities to ensure they do not start with a hyphen if they are intended to be positional arguments. Explicitly reject payloads starting with `-` or `--`.
