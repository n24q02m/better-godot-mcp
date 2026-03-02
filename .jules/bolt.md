# Performance Learnings

- **File Iteration Overhead**: Avoid array spreading `...` inside recursive loops (`results.push(...findFiles())`). Passing down a single accumulator array significantly reduces memory allocations and runs faster.
- **Node.js File Stats**: Use `readdirSync(dir, { withFileTypes: true })` instead of a basic `readdirSync(dir)` plus `statSync(file)`. `withFileTypes` yields `fs.Dirent` objects which provide `.isDirectory()` locally, completely saving the massive overhead of querying `statSync` for every single file.
