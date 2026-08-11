import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/live/*.live.test.ts'],
    exclude: ['build/**', 'node_modules/**', 'bin/**'],
    maxWorkers: 1,
    testTimeout: 30000,
  },
})
