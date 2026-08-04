import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/live/*.full.test.ts'],
    exclude: ['build/**', 'node_modules/**', 'bin/**'],
  },
})
