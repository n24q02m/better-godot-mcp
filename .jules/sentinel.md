## 2025-05-24 - PID Injection in taskkill

**Vulnerability:** Command Injection via pid in taskkill
**Learning:** Tracked process IDs in `activePids` (number[]) could be manipulated if the type system is bypassed (e.g., via `any` or external input that doesn't respect the interface). On Windows, these PIDs are passed to `taskkill` via `execFileSync`.
**Prevention:** Strictly validate that every PID is a safe positive integer (`typeof pid === "number" && Number.isSafeInteger(pid) && pid > 0`) before passing it to `process.kill` or `taskkill`.
