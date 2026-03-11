🎯 **What:** The custom, duplicate logic for parsing, adding, and removing `[input]` actions in `src/tools/composite/input-map.ts` has been removed. `src/tools/helpers/project-settings.ts` was enhanced to support parsing, replacing, and removing multi-line values (like dictionaries with `"{ ... }"`).

💡 **Why:** This improves maintainability by centralizing the INI-like `.godot` config parser in one place (`project-settings.ts`), removing duplicated regex-based multi-line text modification logic in `input-map.ts`, and reducing tech debt. It also improves robustness as the shared parser now strictly handles multiline logic via state machine rather than heuristic line matches.

✅ **Verification:** I ran the entire `tests/` test suite. All tests, including `input-map.test.ts` and `project-settings.test.ts`, pass completely (583 out of 583 tests passing), confirming behavior and backward-compatibility remain intact.

✨ **Result:** A more unified, performant, and cleaner codebase that leverages shared logic instead of one-off custom parsers for multi-line godot actions.
