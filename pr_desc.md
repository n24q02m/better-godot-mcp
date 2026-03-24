🎯 **What:** The `pathExists` helper function in `src/tools/helpers/paths.ts` previously wrapped `access` from `node:fs/promises` but lacked an explicit test for its error-catching logic when unexpected errors (such as `EACCES` permission denied) occur.

📊 **Coverage:** This PR adds a specific test in `tests/helpers/paths.test.ts` that safely mocks `node:fs/promises` using Vitest to simulate an `EACCES` error being thrown by `access`. It confirms the function gracefully catches the error and correctly returns `false`.

✨ **Result:** Test coverage for `src/tools/helpers/paths.ts` is now at 100%, and the codebase is verified to handle non-ENOENT file access errors properly.
