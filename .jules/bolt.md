## 2025-02-27 - [Optimize findInPath split usage]
**Learning:** In hot paths or frequently executed lookup functions like `findInPath` in `src/godot/detector.ts`, using `.split('\n')[0]` introduces unnecessary array allocations and garbage collection overhead.
**Action:** Replace `split('\n')[0]` with `indexOf('\n')` and `slice(0, newlineIdx)` to extract the first line without allocating an intermediate array, adhering to the performance patterns observed in `src/tools/helpers/project-settings.ts` and `src/tools/composite/scenes.ts`. Add `// ⚡ Bolt:` comment to denote intentional optimization.

## 2025-03-02 - [Avoid RegExp compilation for exact string replacements]
**Learning:** Using `.replace(/"/g, '')` incurs overhead due to instantiating and executing a regular expression.
**Action:** Use `.replaceAll('"', '')` instead when performing simple, exact string replacements. This avoids RegExp allocation overhead entirely.

## 2025-03-09 - [Optimize parseProjectGodot string parsing]
**Learning:** Parsing `project.godot` (or other INI-like configurations) line-by-line using regular expressions inside a hot loop (e.g., `^\[(.+)\]$`, `/^([^\s=]+)\s*=\s*(.+)$/`) causes severe performance bottlenecks due to RegExp compilation, execution, and extensive GC pressure from intermediary match objects and string allocations.
**Action:** Replace regular expressions within file parsing loops with manual string operations: use `charCodeAt` to identify section boundaries (e.g., `91` for `[`), `indexOf('=')` for key-value extraction, and direct `.slice()` + `.trim()` for data separation. Apply manual quote removal checking string bounds and `charCodeAt(0) === 34` instead of `.replace(/^"(.*)"$/, '$1')`.

## 2024-05-18 - Replacing match().length with matchAll and indexOf for Garbage Collection
**Learning:** In hot paths (like parsing large Godot configuration or tilemap files), the common pattern `(string.match(regex) || []).length` is surprisingly inefficient. It compiles a regular expression (if dynamic), performs the match, and most importantly, allocates an array containing all matched strings just to immediately discard it after reading the `.length` property. This creates significant garbage collection pressure.
**Action:** Replace `match().length` with custom utility functions. For counting exact substrings, use a `while` loop with `indexOf`. For counting regex matches, use `String.prototype.matchAll(pattern)`, which returns an iterator, allowing counting without allocating a full array. Always ensure string counting loops guard against empty search strings (`if (!search) return 0`) to prevent infinite loops.
