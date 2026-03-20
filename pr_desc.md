🎯 **What:** The testing gap for the synchronous `parseProjectSettings` and `writeProjectSettings` functions in `src/tools/helpers/project-settings.ts` has been addressed.
📊 **Coverage:** Added tests utilizing `vi.mock('node:fs')` to mock file system reads and writes, verifying that the file paths and content encodings match expected behavior and correctly delegate to parsing.
✨ **Result:** Enhanced test suite and coverage by catching errors during file I/O wrapper functions before moving into the actual `parseProjectSettingsContent` parser.
