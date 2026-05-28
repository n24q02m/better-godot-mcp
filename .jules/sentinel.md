## 2025-05-15 - Cross-platform path traversal protection in safeResolve

**Vulnerability:** Path traversal attacks using backslashes ('\\') were not correctly detected on POSIX systems because node:path's resolve and relative methods do not treat backslashes as directory separators on non-Windows platforms.

**Learning:** When implementing security-critical path validation, it is essential to account for cross-platform differences in path separators. A path that is considered relative on POSIX (e.g., '..\\..\\etc\\passwd') might still be dangerous if it is eventually processed by a component that handles Windows-style paths.

**Prevention:**
1. Explicitly normalize all backslashes to forward slashes before performing traversal checks (e.g., `relativePath.replaceAll('\\', '/')`).
2. Implement manual checks for platform-specific absolute path patterns (like Windows drive letters 'C:\\' or UNC paths '\\\\') even when running on other platforms, to prevent them from being misinterpreted as relative paths.
3. Use vitest mocks to simulate different platform environments (by mocking node:path and process.platform) to verify that security logic remains robust regardless of the host OS.
