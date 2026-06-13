## 2025-05-22 - [Correct Tool Suggestion]
**Vulnerability:** Weak matching logic in error suggestions can mislead users or automated agents into calling unintended tools if they make a typo that partially matches multiple tool names.
**Learning:** Prioritizing exact matches and closer prefix matches reduces the risk of incorrect "Did you mean...?" suggestions.
**Prevention:** Implemented a length-difference based tie-breaker for prefix matches in `findClosestMatch` to ensure the most specific match is suggested.
## 2026-06-13 - [Argument Injection Bypass via Leading Spaces]
**Vulnerability:** Input validation using `.startsWith('-')` was bypassed by adding leading spaces to arguments (e.g., `  --flag`), allowing CLI flag injection in Godot commands.
**Learning:** Security checks on command-line arguments must account for whitespace padding if the arguments are later passed to external processes.
**Prevention:** Use `.trim().startsWith('-')` to ensure all hyphen-prefixed arguments are caught regardless of leading whitespace.
