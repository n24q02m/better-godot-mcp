
### Scene Parser Performance
Functions in `src/tools/helpers/scene-parser.ts`, including `removeNodeFromContent` and `setNodePropertyInContent`, were refactored to use direct string traversal (`indexOf('\n')`, `charCodeAt`, `slice`) instead of `split('\n')`. This avoids instantiating large arrays of strings for massive `.tscn` files, providing an observed 2x - 2.6x performance speedup while drastically reducing memory allocation.
