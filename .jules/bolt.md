## 2024-04-14 - String Replacement Optimization
**Learning:** For replacing exact sub-strings, native `String.prototype.replaceAll` is significantly faster than using dynamically created `RegExp` expressions with the `g` flag since it bypasses expression compilation and memory allocation overhead.
**Action:** Always prefer `replaceAll` or `replace` with a string argument for exact match substitution, especially in potentially hot functions like scene parsing/manipulation.
