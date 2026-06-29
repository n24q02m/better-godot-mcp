## 2025-05-22 - [Correct Tool Suggestion]
**Vulnerability:** Weak matching logic in error suggestions can mislead users or automated agents into calling unintended tools if they make a typo that partially matches multiple tool names.
**Learning:** Prioritizing exact matches and closer prefix matches reduces the risk of incorrect "Did you mean...?" suggestions.
**Prevention:** Implemented a length-difference based tie-breaker for prefix matches in `findClosestMatch` to ensure the most specific match is suggested.

## 2026-06-13 - Argument Injection via Space-Padded Flags
**Vulnerability:** Argument injection in CLI-invoking tools.
**Learning:** Checking for leading hyphens using `startsWith('-')` on untrusted input can be bypassed if the attacker pads the flag with leading spaces (e.g., " -s malicious.gd").
**Prevention:** Always `.trim()` user-provided strings before performing safety checks like hyphen-prefixed flag detection.

## 2024-06-27 - Prototype Pollution / Property Injection in Action Dispatchers
**Vulnerability:** Action dispatchers in composite tools (e.g. `nodes.ts`, `signals.ts`) were using plain object lookups (e.g. `const handler = NODE_ACTIONS[action]`) without `Object.hasOwn()` checks.
**Learning:** This exposes the server to prototype pollution or property injection, where an attacker could provide an `action` string like `toString` or `constructor`, causing the server to incorrectly evaluate `Object.prototype` methods as valid tool handlers, potentially leading to errors or crashes.
**Prevention:** Always use `Object.hasOwn(ACTIONS, action)` to verify that the `action` is a direct property of the mapping object, rather than relying on standard property access or the `in` operator, before accessing the handler.

## 2025-05-15 - [PID Validation Security]
**Vulnerability:** Inadequate PID validation could lead to argument injection or errors when interacting with system processes.
**Learning:** Checking only for type 'number' is insufficient as it includes NaN, Infinity, and non-integers. Godot process management requires safe, positive integers.
**Prevention:** Use `Number.isSafeInteger(pid) && pid > 0` and verify the type is strictly `number` to ensure system stability and security.
