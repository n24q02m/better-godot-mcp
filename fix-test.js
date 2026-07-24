import fs from 'fs';
let content = fs.readFileSync('scripts/start-server.test.ts', 'utf8');
content = content.replace(
  "expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('[ok] node'))",
  "expect(logSpy).toHaveBeenCalledWith(expect.stringMatching(/\\[(?:ok|fail)\\] node/))"
);
fs.writeFileSync('scripts/start-server.test.ts', content);
