## 2024-06-13 - [CLEANUP] Avoid direct console.error in logger

**Learning:** Replacing direct `console.error` with `process.stderr.write` and `format` in a centralized logger ensures diagnostic output is robust, bypasses global console overrides, and strictly targets stderr, which is critical for MCP servers to avoid protocol interference on stdout.

**Action:** When implementing or refactoring loggers in headless server environments (like MCP), prefer low-level stream writes (`process.stderr.write`) over the `console` object to ensure output predictability and protocol safety.
