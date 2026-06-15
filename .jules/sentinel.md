## 2025-05-22 - [Correct Tool Suggestion]
**Vulnerability:** Weak matching logic in error suggestions can mislead users or automated agents into calling unintended tools if they make a typo that partially matches multiple tool names.
**Learning:** Prioritizing exact matches and closer prefix matches reduces the risk of incorrect "Did you mean...?" suggestions.
**Prevention:** Implemented a length-difference based tie-breaker for prefix matches in `findClosestMatch` to ensure the most specific match is suggested.

## 2025-02-24 - Space-padded Command Injection Bypass
**Vulnerability:** Command arguments configured to start with a hyphen were checked directly via `.startsWith('-')` without trimming the input. This allowed a malicious user to supply space-padded arguments (e.g. `' --malicious'`), circumventing the hyphen constraint and still passing the input to the external binary process.
**Learning:** Shell engines often discard leading space paddings on string parameter values before invoking target binaries locally or on execution paths, whereas Javascript natively matches spaces inside strings causing simplistic regex matches or `.startsWith` constraints on untrimmed data to fail erroneously to the side of danger.
**Prevention:** Always use `.trim()` on user-provided strings before inspecting them for security restrictions (like `--`, `-`, or `/` flags) leading external process calls.
