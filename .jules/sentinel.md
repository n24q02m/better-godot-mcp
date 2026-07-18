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
## 2024-10-24 - Prototype Pollution in Tool Registry
**Vulnerability:** The central `TOOL_HANDLERS` object mapping in `src/tools/registry.ts` accessed handler objects using plain object lookup (`const handler = TOOL_HANDLERS[name]`).
**Learning:** Plain property accesses on objects expose them to prototype pollution attacks, where input representing an action or tool matching an `Object.prototype` key (like `toString` or `constructor`) can result in the lookup successfully returning a built-in method rather than throwing an unknown tool error. This bypasses validation logic and may lead to crashes if the runtime attempts to invoke `toString` as if it were a tool handler function.
**Prevention:** Always wrap key lookups on unverified user input against plain object maps using `Object.hasOwn(obj, key)` before accessing and invoking values as functions.
## 2025-02-14 - Numeric Parameter File Injection
**Vulnerability:** User-controlled numeric parameters (`deadzone`, `tile_size`, `font_size`, `duration`) were cast to `number` without runtime type checks (e.g., `args.deadzone as number`) and directly injected into generated Godot files (`.tscn`, `.tres`, `project.godot`).
**Learning:** In TypeScript, the `as number` cast does not guarantee the runtime value is actually a number. An attacker can pass a malicious string containing newlines and structured content (like `[sub_resource ...]`), bypassing structural validation logic that often focuses strictly on strings.
**Prevention:** Always use runtime validation (`typeof args.param !== 'number'`) before trusting numeric parameters that are interpolated into structured file outputs.

## 2025-02-24 - [Path Traversal in Godot Config Paths]
**Vulnerability:** Path traversal vulnerabilities allowed reading or modifying arbitrary `project.godot` files by providing paths that escaped the trusted base directory. Although `safeResolve` was used, it was called as `safeResolve(config.projectPath, projectPath)`. The `safeResolve` function prevents the resolved path from escaping the *result* of the first argument, but if the `projectPath` is used directly in `join` later, or if the base was not properly confined to the project root, it could still lead to issues. More importantly, the system has a `resolveProjectRoot` helper specifically designed to confine the user-provided `projectPath` safely within `config.projectPath`.
**Learning:** `safeResolve` protects the target path within the base, but if the "base" is untrusted or unconfined, path traversal can still occur. `resolveProjectRoot` ensures the `projectPath` itself is safely contained within `config.projectPath` before it's used as the root for subsequent `safeResolve` calls. Many configuration-based endpoints were manually replicating the base mapping incorrectly.
**Prevention:** Always use `resolveProjectRoot(args.project_path, config.projectPath)` to derive the trusted base path for operations, rather than `safeResolve(config.projectPath, projectPath)`.
