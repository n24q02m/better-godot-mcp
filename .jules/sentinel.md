## 2025-02-27 - [Argument Injection via Padded Hyphen Flags]
**Vulnerability:** Command line tools `config.ts` and `project.ts` checked if an argument string started with a hyphen `startsWith('-')` to prevent execution of malicious shell flags, but an attacker could bypass this check by prefixing the flag with whitespace (`" -flag"`).
**Learning:** `startsWith()` does not ignore leading whitespace, making it an insufficient defense for parsing shell arguments without prior normalization.
**Prevention:** Always `trim()` string inputs before validating prefix or suffix bounds to ensure spaces cannot be used to circumvent security checks.
