## 2024-05-18 - Overly Broad Process Termination
**Vulnerability:** The Godot `project stop` action used `pkill -f godot` and `taskkill /IM godot.exe`, which would indiscriminately terminate all Godot processes on the user's system, not just the one launched by the MCP server.
**Learning:** Using broad pattern matching for process termination is unsafe in multi-tenant or shared environments, as it can result in denial of service or unexpected state loss for unrelated processes.
**Prevention:** Always capture and track the PID of the spawned child process (`activePids`), and use targeted signals (`process.kill(pid)`) or PID-specific commands (`taskkill /PID`) to terminate only the specific process tree managed by the server.
