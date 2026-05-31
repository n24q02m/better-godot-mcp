## 2024-06-01 - Caching Filesystem Discovery Results
**Learning:** Repetitive filesystem discovery (e.g., checking multiple paths to find a documentation directory) can block the Node.js event loop and degrade server performance if called frequently during request handling, especially when using synchronous or numerous async I/O calls.
**Action:** Always cache the results of static filesystem discovery operations (like finding the `docs` directory) in a module-level variable to eliminate redundant I/O and reduce event loop blocking for subsequent requests.

## 2024-06-01 - Caching Filesystem Discovery Results
**Learning:** Repetitive filesystem discovery (e.g., checking multiple paths to find a documentation directory) can block the Node.js event loop and degrade server performance if called frequently during request handling, especially when using synchronous or numerous async I/O calls.
**Action:** Always cache the results of static filesystem discovery operations (like finding the `docs` directory) in a module-level variable to eliminate redundant I/O and reduce event loop blocking for subsequent requests.
