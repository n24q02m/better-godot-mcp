## 2025-05-15 - ReDoS Protection in Scene File Parsing
**Vulnerability:** Unsafe dynamic Regular Expressions like `new RegExp(\`(\\[node name="${escapeRegExp(nodeName)}"[^\\]]*\\])\`)` are susceptible to Regular Expression Denial of Service (ReDoS) when processing malicious node names or large files with many attribute-like patterns.
**Learning:** Manual string slicing and RegExp-based node attribute injection are error-prone and lead to property duplication (e.g., multiple `collision_layer` entries for the same node).
**Prevention:** Use the centralized `updateNodeInScene` utility from `src/tools/helpers/scene-parser.ts`. It uses high-performance string lookups (`indexOf`, `slice`) and line-by-line processing, ensuring both security and property deduplication.
