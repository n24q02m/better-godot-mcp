## 2025-02-27 - [Optimize findInPath split usage]
**Learning:** In hot paths or frequently executed lookup functions like `findInPath` in `src/godot/detector.ts`, using `.split('\n')[0]` introduces unnecessary array allocations and garbage collection overhead.
**Action:** Replace `split('\n')[0]` with `indexOf('\n')` and `slice(0, newlineIdx)` to extract the first line without allocating an intermediate array, adhering to the performance patterns observed in `src/tools/helpers/project-settings.ts` and `src/tools/composite/scenes.ts`. Add `// ⚡ Bolt:` comment to denote intentional optimization.

## 2025-03-02 - [Avoid RegExp compilation for exact string replacements]
**Learning:** Using `.replace(/"/g, '')` incurs overhead due to instantiating and executing a regular expression.
**Action:** Use `.replaceAll('"', '')` instead when performing simple, exact string replacements. This avoids RegExp allocation overhead entirely.

## 2025-03-09 - [Optimize parseProjectGodot string parsing]
**Learning:** Parsing `project.godot` (or other INI-like configurations) line-by-line using regular expressions inside a hot loop (e.g., `^\[(.+)\]$`, `/^([^\s=]+)\s*=\s*(.+)$/`) causes severe performance bottlenecks due to RegExp compilation, execution, and extensive GC pressure from intermediary match objects and string allocations.
**Action:** Replace regular expressions within file parsing loops with manual string operations: use `charCodeAt` to identify section boundaries (e.g., `91` for `[`), `indexOf('=')` for key-value extraction, and direct `.slice()` + `.trim()` for data separation. Apply manual quote removal checking string bounds and `charCodeAt(0) === 34` instead of `.replace(/^"(.*)"$/, '$1')`.

## 2025-03-09 - [Optimize documentation directory discovery]
**Learning:** Using `Promise.all` with `map` for file system discovery operations (like finding the documentation path) executes redundant parallel I/O checks even after a valid path is found. Furthermore, repeating this discovery process on every command blocks the event loop unnecessarily.
**Action:** Replace parallel `Promise.all(array.map(...))` I/O lookups with a sequential `for...of` loop with an early return, and store the result in a module-level variable to cache the result, preventing redundant file system operations on subsequent invocations.
## 2025-05-15 - [Optimization] Redundant pathExists checks in resources tool
**Learning:** Sequential `pathExists` and `stat`/`readFile`/`unlink` operations result in redundant filesystem calls. Direct execution with `try-catch` handling for `ENOENT` is more efficient for existing files.
**Action:** Replaced `pathExists` followed by I/O operations in `handleResources` with direct calls and `NodeJS.ErrnoException` code checks.
## 2026-06-04 - [PERF] O(N) Lookups via Object.values and .find()
**Learning:** In scene parsing and node management, repeated (N)$ searches through arrays (like `scene.nodes` or `scene.connections`) can become a bottleneck as scene complexity grows. Introducing Map-based indexing during the initial single-pass parse provides (1)$ lookups for common search patterns (by path, by name, by signal signature) with negligible memory overhead.
**Action:** Added `nodesByPath`, `nodesByName`, and `connectionsKeyed` Maps to the `ParsedScene` interface and populated them in `parseSceneContent`. Refactored `findNode`, `handleAddNode`, and `handleSignals` to use these maps.
## 2025-05-22 - [Optimized Prefix Matching]
**Learning:** Returning the first prefix match in a list of valid options can lead to incorrect results if a longer, more specific prefix or an exact match exists later in the list.
**Action:** Refactored `findClosestMatch` in `src/tools/helpers/errors.ts` to use a prioritized hierarchy:
1. Case-insensitive exact match (early return).
2. Best prefix/containment match, defined as the one with the smallest absolute length difference relative to the input.
3. Fuzzy bigram similarity (Dice coefficient) with a threshold > 0.4.
This ensures that "create" matches "create" even if "create_node" appears earlier in the options list, and "cre" matches "create" over "create_node".
