## 2025-05-22 - [Correct Tool Suggestion]
**Vulnerability:** Weak matching logic in error suggestions can mislead users or automated agents into calling unintended tools if they make a typo that partially matches multiple tool names.
**Learning:** Prioritizing exact matches and closer prefix matches reduces the risk of incorrect "Did you mean...?" suggestions.
**Prevention:** Implemented a length-difference based tie-breaker for prefix matches in `findClosestMatch` to ensure the most specific match is suggested.

## 2025-05-23 - [CLI Flag Injection Bypass]
**Vulnerability:** Argument injection checks (like checking if a path starts with `-` to avoid it being interpreted as a CLI flag by an external command) could be bypassed by padding the input with leading spaces.
**Learning:** Checking for `.startsWith('-')` without trimming first allows malicious inputs like `" --flag"` to bypass validation and get injected into command line executions.
**Prevention:** Always `trim()` string arguments before performing `.startsWith('-')` or similar security checks against CLI flag injection.
