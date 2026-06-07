## 2025-02-27 - [Optimize findInPath split usage]
**Learning:** In hot paths or frequently executed lookup functions like `findInPath` in `src/godot/detector.ts`, using `.split('\n')[0]` introduces unnecessary array allocations and garbage collection overhead.
**Action:** Replace `split('\n')[0]` with `indexOf('\n')` and `slice(0, newlineIdx)` to extract the first line without allocating an intermediate array, adhering to the performance patterns observed in `src/tools/helpers/project-settings.ts` and `src/tools/composite/scenes.ts`. Add `// ⚡ Bolt:` comment to denote intentional optimization.

## 2025-03-02 - [Avoid RegExp compilation for exact string replacements]
**Learning:** Using `.replace(/"/g, '')` incurs overhead due to instantiating and executing a regular expression.
**Action:** Use `.replaceAll('"', '')` instead when performing simple, exact string replacements. This avoids RegExp allocation overhead entirely.

## 2025-03-09 - [Optimize parseProjectGodot string parsing]
**Learning:** Parsing `project.godot` (or other INI-like configurations) line-by-line using regular expressions inside a hot loop (e.g., `^\[(.+)\]$`, `/^([^\s=]+)\s*=\s*(.+)$/`) causes severe performance bottlenecks due to RegExp compilation, execution, and extensive GC pressure from intermediary match objects and string allocations.
**Action:** Replace regular expressions within file parsing loops with manual string operations: use `charCodeAt` to identify section boundaries (e.g., `91` for `[`), `indexOf('=')` for key-value extraction, and direct `.slice()` + `.trim()` for data separation. Apply manual quote removal checking string bounds and `charCodeAt(0) === 34` instead of `.replace(/^"(.*)"$/, '$1')`.

## Refactoring Complex Tool Handlers (Audio)
- **Modularization**: Large tool handlers like `handleAudio` should be refactored by extracting each case into its own `async` handler function.
- **Performance**: For line-by-line parsing of Godot configuration files (`.tres`, `.tscn`), prefer manual string scanning (`indexOf`, `slice`, `startsWith`) over `RegExp.matchAll` to minimize memory allocations and garbage collection pressure.
- **Security**: Centralize string validation using helpers like `validateNoNewlines`. Ensure that error messages are consistent with existing security test suites (e.g., `tests/composite/ui-security.test.ts`) to avoid breaking CI.
- **Consistency**: Maintain legacy validation logic (like double-quote rejection) when it's required by the project's security model or the underlying file format.
