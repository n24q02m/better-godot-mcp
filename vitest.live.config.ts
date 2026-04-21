import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/live/mcp-protocol.live.test.ts'],
    exclude: ['build/**', 'node_modules/**', 'bin/**'],
    testTimeout: 30000,
  },
})
