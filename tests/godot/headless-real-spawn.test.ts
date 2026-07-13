/**
 * Integration test for spawnCaptured using a real (unmocked) child process.
 * Verifies stdout/stderr are actually captured end-to-end, not just that the
 * mocked spawn call was wired correctly (see headless.test.ts for the mocked unit tests).
 *
 * Uses spawnCaptured directly with the current runtime binary as the fake "godot" -- not
 * runGodotProject with a test-only extra parameter, which would change its public signature.
 */
import { describe, expect, it } from 'vitest'
import { clearProjectLogs, getProjectLogs, spawnCaptured } from '../../src/godot/headless.js'

describe('spawnCaptured (real child process)', () => {
  it('captures real stdout and stderr output from a spawned process', async () => {
    const { pid } = spawnCaptured(process.execPath, [
      '-e',
      "console.log('line1'); console.error('line2'); console.log('line3')",
    ])
    expect(pid).toBeDefined()

    await new Promise((resolve) => setTimeout(resolve, 500))

    const logs = getProjectLogs(pid as number)
    expect(logs?.lines.join('\n')).toContain('line1')
    expect(logs?.lines.join('\n')).toContain('line2')
    expect(logs?.lines.join('\n')).toContain('line3')

    clearProjectLogs(pid as number)
  })
})
