## 2025-05-22 - [Correct Tool Suggestion]
**Vulnerability:** Weak matching logic in error suggestions can mislead users or automated agents into calling unintended tools if they make a typo that partially matches multiple tool names.
**Learning:** Prioritizing exact matches and closer prefix matches reduces the risk of incorrect "Did you mean...?" suggestions.
**Prevention:** Implemented a length-difference based tie-breaker for prefix matches in `findClosestMatch` to ensure the most specific match is suggested.
## 2025-05-22 - [Argument Injection Bypass via Space-Padded Flags]
**Vulnerability:** A `startsWith('-')` check was used to prevent hyphens at the beginning of command-line arguments. However, this could be bypassed by padding the input with leading spaces (e.g., `"  --malicious"`).
**Learning:** External processes (like Godot CLI) often trim arguments before parsing them. Simple prefix checks on untrimmed user inputs are insufficient when protecting against flag injection.
**Prevention:** Always `.trim()` user inputs before executing prefix validation checks intended to block CLI flags.
