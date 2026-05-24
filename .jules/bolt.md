## 2025-02-27 - [Optimize findInPath split usage]
**Learning:** In hot paths or frequently executed lookup functions like `findInPath` in `src/godot/detector.ts`, using `.split('\n')[0]` introduces unnecessary array allocations and garbage collection overhead.
**Action:** Replace `split('\n')[0]` with `indexOf('\n')` and `slice(0, newlineIdx)` to extract the first line without allocating an intermediate array, adhering to the performance patterns observed in `src/tools/helpers/project-settings.ts` and `src/tools/composite/scenes.ts`. Add `// ⚡ Bolt:` comment to denote intentional optimization.

## 2025-03-02 - [Avoid RegExp compilation for exact string replacements]
**Learning:** Using `.replace(/"/g, '')` incurs overhead due to instantiating and executing a regular expression.
**Action:** Use `.replaceAll('"', '')` instead when performing simple, exact string replacements. This avoids RegExp allocation overhead entirely.
