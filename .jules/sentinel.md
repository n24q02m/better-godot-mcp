## Security Fix: Regular Expression Replacement Injection
When replacing substrings using `String.prototype.replace(regex, replacementString)` in TypeScript/JavaScript, the `replacementString` is not treated as a literal if it contains special characters like `$`, `$1`, `$&`, etc. This allows for injection vulnerabilities if the replacement string is dynamically constructed from user input.
To fix this, either use a replacer function `String.prototype.replace(regex, () => replacementString)` or safely escape the `$` characters in the replacement string.

**Context:** The `renameNodeInContent` function in `src/tools/helpers/scene-parser.ts` used string replacement and an attacker could pass `$1` as a new node name to inject backreferences, modifying the regex replacement unexpectedly. Fixed by changing the string replacements to use arrow functions `() => ...` and `(_, p1, p2) => ...`.
