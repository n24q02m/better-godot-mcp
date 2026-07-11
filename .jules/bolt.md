## 2025-06-25 - [Optimize redundant pathExists checks in ui, animation, navigation tools]
**Learning:** Sequential `pathExists` followed by I/O operations like `readFile` or `writeFile` causes redundant filesystem calls, which can impact performance. Additionally, checking `pathExists` before creating a file is not thread-safe/atomic.
**Action:** Replaced `pathExists` followed by `readFile` with direct `readFile` wrapped in a `try...catch` handling `ENOENT`. Applied in `src/tools/composite/ui.ts`, `src/tools/composite/animation.ts`, and `src/tools/composite/navigation.ts`.
