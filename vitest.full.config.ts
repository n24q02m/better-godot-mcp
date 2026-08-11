import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/live/*.full.test.ts'],
    exclude: ['build/**', 'node_modules/**', 'bin/**'],
    // Each suite launches a real Godot-backed MCP process; parallel suites
    // exhaust the Windows process/startup budget and trip the 15s hook guard.
    maxWorkers: 1,
  },
})
