
## 2024-05-18 - Replacing fs.existsSync with non-blocking checks in MCP server tools
**Learning:** `existsSync`, `readFileSync`, and `writeFileSync` from `node:fs` block the Node.js event loop, creating noticeable performance degradation when multiple asynchronous events are expected (e.g. MCP server requests). While I/O latency for tiny files might be slower with Promises on single threads, wrapping asynchronous execution correctly can actually increase total throughput and avoid blocking the event loop entirely. Wrapping `await stat()` inside a `try/catch` block replaces the need for `existsSync()`.
**Action:** When updating other tools in the codebase, consistently replace all synchronous fs actions with their `node:fs/promises` equivalents to maintain application responsiveness.
