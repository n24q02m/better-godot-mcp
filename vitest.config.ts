import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/tools/composite/physics.ts'],
      reporter: ['text', 'json', 'html'],
    },
  },
})
