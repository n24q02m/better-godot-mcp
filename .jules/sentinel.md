## 2025-05-22 - [Correct Tool Suggestion]
**Vulnerability:** Weak matching logic in error suggestions can mislead users or automated agents into calling unintended tools if they make a typo that partially matches multiple tool names.
**Learning:** Prioritizing exact matches and closer prefix matches reduces the risk of incorrect "Did you mean...?" suggestions.
**Prevention:** Implemented a length-difference based tie-breaker for prefix matches in `findClosestMatch` to ensure the most specific match is suggested.

## 2026-06-13 - Argument Injection via Space-Padded Flags
**Vulnerability:** Argument injection in CLI-invoking tools.
**Learning:** Checking for leading hyphens using `startsWith('-')` on untrusted input can be bypassed if the attacker pads the flag with leading spaces (e.g., " -s malicious.gd").
**Prevention:** Always `.trim()` user-provided strings before performing safety checks like hyphen-prefixed flag detection.
## 2025-05-14 - [SECURITY] Potential Path Traversal in File Operations
**Vulnerability:** Weak path resolution in `scenes.ts` and a bug in the custom `canonicalize` logic in `paths.ts`.
**Learning:** Manual path component extraction using `slice(parent.length + 1)` is brittle and fails when the parent is the filesystem root (e.g., `/` has length 1, so it skips the first 2 characters of `/foo`, resulting in `oo`).
**Prevention:** Always use standard path utilities like `basename()` for component extraction. Centralize project root resolution using `resolveProjectRoot` to ensure consistent confinement checks across all tool handlers.
