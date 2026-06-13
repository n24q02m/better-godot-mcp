## 2025-05-22 - [Correct Tool Suggestion]
**Vulnerability:** Weak matching logic in error suggestions can mislead users or automated agents into calling unintended tools if they make a typo that partially matches multiple tool names.
**Learning:** Prioritizing exact matches and closer prefix matches reduces the risk of incorrect "Did you mean...?" suggestions.
**Prevention:** Implemented a length-difference based tie-breaker for prefix matches in `findClosestMatch` to ensure the most specific match is suggested.
## 2025-05-23 - [Insufficient Input Validation for Config Values]
**Vulnerability:** Insufficient validation for configuration values (timeout and paths) could allow passing unintended arguments or potentially dangerous strings that might be misused if executed in a shell.
**Learning:** Even when using `spawn` or `execFile` without a shell, strict validation of all user-controlled configuration parameters is essential to prevent argument injection or logic bypass.
**Prevention:** Implemented strict numeric validation for `timeout` (positive integer string, 1ms to 1hr) and tightened path validation to reject leading/trailing whitespace and multiple consecutive spaces. Integrated `validateNoNewlines` for consistent newline rejection across all config values.
