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

## 2025-06-11 - [Optimize redundant pathExists checks in tilemap tool]
**Learning:** Sequential `pathExists` followed by I/O operations like `readFile` or `writeFile` causes redundant filesystem calls, which can impact performance. Additionally, checking `pathExists` before creating a file is not thread-safe/atomic.
**Action:** Replaced `pathExists` followed by `readFile` with direct `readFile` wrapped in a `try...catch` handling `ENOENT`. Replaced `pathExists` + `writeFile` with `writeFile` using `flag: 'wx'` to atomically check for existence and create the file, catching `EEXIST`. Applied in `src/tools/composite/tilemap.ts`.

## 2025-06-20 - [Optimize parseGodotValue structural types RegExp matching]
**Learning:** Checking for string prefixes (`Vector2(`, `Rect2(`, etc.) is faster than immediately passing the string into a regular expression. Also, when extracting groups from non-global regular expressions, `REGEX.exec(string)` is generally preferred over `string.match(REGEX)`.
**Action:** Guard Regular Expression evaluations in `parseGodotValue` with `.startsWith()` string checks, and replaced `.match()` with `.exec()`. Added `// ⚡ Bolt:` comments to indicate intentional performance optimization.

## 2026-06-20 - Pre-compile Regex in hot paths
**Learning:** Evaluating regular expressions directly via `String.prototype.match()` in hot paths (like parsing metadata for every resource) unnecessarily recreates RegExp instances and allocates arrays. Using a module-level pre-compiled RegExp with `RegExp.prototype.exec()` reduces these overheads and handles iterations more efficiently.
**Action:** Extract inline regular expressions to module-scoped constants and use `exec()` for faster parsing in large files or deep iterations.

## 2025-06-18 - [Avoid `split('\\n')` for line-by-line parsing in Input Map]
**Learning:** Using `split('\n')` creates an array of strings in memory. This array allocation and string duplication can be a bottleneck when repeatedly iterating through Godot's `project.godot` lines, especially if the file is large and parsing happens frequently in hot paths.
**Action:** Replace `split('\n')` combined with iteration (e.g. `for (let i = 0; i < lines.length; i++)`) with a `while` loop that uses `indexOf('\n', pos)` and `slice(pos, lineEnd)` to extract lines continuously without intermediate array allocations.

## 2025-06-25 - [Avoid RegExp.matchAll() for structural parsing]
**Learning:** Using `RegExp.prototype.matchAll()` or `String.prototype.match()` to parse structured file formats (like Godot's `.tscn` files) requires executing complex regex patterns and creating intermediate array objects for each match. This is less efficient than using a centralized, single-pass structural parser (like `parseSceneContent`), which avoids regex execution overhead entirely.
**Action:** Replace `matchAll` and `match` usage with existing single-pass structural parsers when analyzing `.tscn` contents. Reusing a standard parser prevents redundant parsing work, eliminates regular expression array allocations, and improves maintainability.
## 2025-02-12 - [FIX] Extract string trim logic to helper
**Learning:** Manual string trimming loops (`while (charCodeAt(i) <= 32)`) were duplicated across multiple structural parsers (`input-map.ts`, `project-settings.ts`, `scene-parser.ts`, `project.ts`). Centralizing this into a `fastTrimRange` helper reduces code duplication and ensures consistent whitespace handling across the codebase while maintaining zero-allocation performance.
**Action:** Use `fastTrimRange(str, start, end)` in `src/tools/helpers/strings.ts` for any future structural parsers that need to handle Godot-style whitespace trimming within string ranges.

## 2025-06-25 - [Optimize redundant pathExists checks in scripts tool]
**Learning:** Sequential `pathExists` followed by I/O operations like `readFile`, `writeFile`, or `unlink` causes redundant filesystem calls, which can impact performance. Additionally, checking `pathExists` before creating a file is not atomic.
**Action:** Replaced `pathExists` followed by `readFile`/`unlink` with direct `readFile`/`unlink` wrapped in a `try...catch` handling `ENOENT`. Replaced `pathExists` + `writeFile` with `writeFile` using `flag: 'wx'` to atomically check for existence and create the file, catching `EEXIST`. Applied in `src/tools/composite/scripts.ts`.

## 2025-06-25 - [Optimize node filtering by type]
**Learning:** Iterating over `scene.nodes` (which can contain tens of thousands of elements in large scenes) just to filter out specific node types (e.g. `Control` or `AnimationPlayer`) causes unnecessary O(N) array traversals on every tool invocation.
**Action:** Introduced a `nodesByType` Map in `ParsedScene` that groups nodes by their type during the initial, single-pass string parsing. This allows for O(1) retrieval of node arrays by type, speeding up type-specific operations.

## 2025-06-25 - [Optimize scene info extraction]
**Learning:** Using `scene.nodes.map` constructs an intermediate array dynamically, triggering repeated memory allocations when parsing scenes with tens of thousands of nodes. This adds significant garbage collection overhead compared to pre-allocating an array.
**Action:** Replace `scene.nodes.map(...)` in `src/tools/composite/scenes.ts` with a direct loop over a pre-allocated array (`new Array(scene.nodes.length)`). This avoids intermediary allocation overhead and significantly speeds up scene info extraction.

## 2025-06-25 - [Optimize redundant pathExists checks in scenes tool]
**Learning:** Sequential `pathExists` followed by I/O operations like `writeFile` or `copyFile` causes redundant filesystem calls, which can impact performance. Additionally, checking `pathExists` before creating or copying a file is not thread-safe/atomic.
**Action:** Replaced `pathExists` + `writeFile` with `writeFile` using `flag: 'wx'` to atomically check for existence and create the file, catching `EEXIST`. Replaced `pathExists` + `copyFile` with `copyFile` using `constants.COPYFILE_EXCL` flag from `node:fs` to atomically check for existence and copy the file, catching `EEXIST`. Applied in `src/tools/composite/scenes.ts`.
## 2025-03-10 - [O(K) Filtering by type using nodesByType]
**Learning:** Iterating through `scene.nodes` to find nodes of specific types (e.g. `CONTROL_TYPES`) is an O(N) operation that scales poorly with large scenes. The previously introduced `nodesByType` index in `ParsedScene` was not fully utilized for multi-type queries.
**Action:** When filtering a subset of node types, iterate through the allowed types (e.g., `for (const type of CONTROL_TYPES)`) and fetch from the O(1) `nodesByType` index, reducing the operation complexity from O(N) to O(K) where K is the number of queried types.

## 2025-03-10 - [Pre-allocate arrays for node listing]
**Learning:** Dynamically growing arrays using `.push()` inside an O(N) traversal (like listing all nodes in a scene) causes resizing overhead in the V8 engine, which accumulates heavily in scenes with tens of thousands of nodes.
**Action:** Always use a pre-allocated array (`new Array(scene.nodes.length)`) for 1:1 mapping operations during O(N) loops, avoiding V8 array resizing penalties.
