## 2025-05-22 - [Correct Tool Suggestion]
**Vulnerability:** Weak matching logic in error suggestions can mislead users or automated agents into calling unintended tools if they make a typo that partially matches multiple tool names.
**Learning:** Prioritizing exact matches and closer prefix matches reduces the risk of incorrect "Did you mean...?" suggestions.
**Prevention:** Implemented a length-difference based tie-breaker for prefix matches in `findClosestMatch` to ensure the most specific match is suggested.
## 2025-05-22 - [Process ID Validation Weakness]
**Vulnerability:** The codebase previously used a pattern of `if (!isValidPid(pid)) continue` to skip invalid PIDs in `project.ts` and `editor.ts`. While this prevented injection by avoiding shell execution, it silently swallowed the failure. This could obscure tampering or hide corrupted internal state, allowing an attacker to insert malicious PIDs into the configuration undetected while legitimate processes were left untouched.
**Learning:** Silently ignoring validation errors can hide active attacks or state corruption.
**Prevention:** Replaced silent `continue` with `validatePid(pid)` which explicitly throws a `GodotMCPError` with `INVALID_ARGS`. This ensures failures are surfaced securely without exposing sensitive execution details, adhering to the "fail securely" principle and providing clear visibility into invalid input attempts.
