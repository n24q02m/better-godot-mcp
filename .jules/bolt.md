
## Optimize string parsing to avoid memory allocation for lines array
* When parsing text configurations line by line (like in `src/tools/composite/input-map.ts`), replacing `content.split('\n')` with a `while` loop using `indexOf('\n', pos)` and `content.slice(pos, nextNewline)` avoids allocating a large array of all string lines.
* This showed about ~30% speedup on a large 750KB project.godot file with dummy entries.
