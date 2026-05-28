## 2025-05-22 - Quote-aware Comma-Separated List Parsing
**Vulnerability:** Broken parser in `parseCommaSeparatedList` which split items on commas even when they were inside quotes (e.g., `"a, b", c` became `["a", "b", "c"]`).
**Learning:** Fast-path parsers using `indexOf` must be carefully audited for context-sensitive delimiters like commas in quoted strings.
**Prevention:** Use a single-pass character-by-character loop with state tracking (e.g., `inQuotes`) for robust parsing of delimited strings that allow quoting.
