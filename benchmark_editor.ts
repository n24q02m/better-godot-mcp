import { handleEditor } from './src/tools/composite/editor.js';
import { makeConfig } from './tests/fixtures.js';

const config = makeConfig();

console.log('Starting benchmark...');
const start = performance.now();

// Simulate a concurrent workload (e.g. handling other requests)
let ticks = 0;
const interval = setInterval(() => {
  ticks++;
}, 1); // 1ms interval

try {
    // verifying that handleEditor is blocking despite being async
    await handleEditor('status', {}, config);
} catch (e) {
    console.error(e);
}

const end = performance.now();
clearInterval(interval);
const duration = end - start;

console.log(`Execution time: ${duration.toFixed(2)}ms`);
console.log(`Ticks: ${ticks}`);
console.log(`Ticks per ms: ${(ticks / duration).toFixed(2)}`);

// If blocking, Ticks should be significantly less than duration (in ms) because the loop is blocked.
// If non-blocking, Ticks should be closer to duration.
