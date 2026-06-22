## 2025-05-22 - [Correct Tool Suggestion]
**Vulnerability:** Weak matching logic in error suggestions can mislead users or automated agents into calling unintended tools if they make a typo that partially matches multiple tool names.
**Learning:** Prioritizing exact matches and closer prefix matches reduces the risk of incorrect "Did you mean...?" suggestions.
**Prevention:** Implemented a length-difference based tie-breaker for prefix matches in `findClosestMatch` to ensure the most specific match is suggested.

## 2026-06-13 - Argument Injection via Space-Padded Flags
**Vulnerability:** Argument injection in CLI-invoking tools.
**Learning:** Checking for leading hyphens using `startsWith('-')` on untrusted input can be bypassed if the attacker pads the flag with leading spaces (e.g., " -s malicious.gd").
**Prevention:** Always `.trim()` user-provided strings before performing safety checks like hyphen-prefixed flag detection.
## 2026-06-21 - Flag Injection via Tool Argument Validation Gap
**Vulnerability:** Flag injection in CLI-invoking tools.
**Learning:** Checking for leading hyphens must be applied consistently across all tools that accept file paths or similar arguments passed to external commands. The `handleEditor` tool lacked the protection already present in `handleProject`.
**Prevention:** Apply the `.trim().startsWith('-')` check universally to any untrusted argument that will eventually be used as an argument to a spawned process.
