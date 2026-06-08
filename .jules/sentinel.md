## 2025-05-22 - [Correct Tool Suggestion]
**Vulnerability:** Weak matching logic in error suggestions can mislead users or automated agents into calling unintended tools if they make a typo that partially matches multiple tool names.
**Learning:** Prioritizing exact matches and closer prefix matches reduces the risk of incorrect "Did you mean...?" suggestions.
**Prevention:** Implemented a length-difference based tie-breaker for prefix matches in `findClosestMatch` to ensure the most specific match is suggested.
- Refactored `collision_setup` and `body_config` in `src/tools/composite/physics.ts` to use `updateNodeInScene` to fix a ReDoS vulnerability via unsafe dynamic RegExp.
- Added test cases in `tests/composite/physics.test.ts` to verify property updates and ensure no duplication.
- Verified that all existing tests pass and the code complies with project linting and formatting rules.
