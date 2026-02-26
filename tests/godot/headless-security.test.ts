import { describe, expect, it } from 'vitest'
import { execGodotSync } from '../../src/godot/headless.js'

describe('Godot Headless Security', () => {
  it('should prevent command injection in godotPath', () => {
    // Malicious path that tries to execute 'echo INJECTED'
    // If vulnerable (using execSync), this runs and output contains INJECTED.
    // If secure (using execFileSync), this fails as ENOENT or similar.

    // Construct a path that would be valid in shell but not as a file
    const maliciousPath = '"; echo INJECTED; echo "'

    // We expect this to execute safely (i.e., try to find a file with that name)
    // rather than executing the shell command.

    const result = execGodotSync(maliciousPath, ['--version'])

    // Verification:
    // 1. stdout should NOT contain 'INJECTED'
    expect(result.stdout).not.toContain('INJECTED')

    // 2. Ideally, it should fail because the file named `"; echo INJECTED; echo "` likely doesn't exist
    // However, if the vulnerability exists, result.success might be true (because echo succeeds)

    if (result.stdout.includes('INJECTED')) {
      throw new Error('VULNERABILITY DETECTED: Command injection successful')
    }
  })
})
