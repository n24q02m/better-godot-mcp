import { execFileSync } from 'node:child_process'
import { describe, expect, it, vi } from 'vitest'
import type { GodotConfig } from '../../src/godot/types.js'
import { handleEditor } from '../../src/tools/composite/editor.js'
import { handleProject } from '../../src/tools/composite/project.js'

vi.mock('node:child_process')

describe('PID Injection Security', () => {
  it('should prevent command injection via activePids in project stop', async () => {
    // We inject a string that would exploit taskkill if it wasn't validated
    // But since GodotConfig activePids expects number[], we can force a malicious cast
    // biome-ignore lint/suspicious/noExplicitAny: Required to bypass type system for security injection testing
    const maliciousPid = '1234 /T & echo injected' as any
    const config: GodotConfig = {
      projectPath: '/tmp/project',
      godotPath: '/usr/bin/godot',
      godotVersion: null,
      activePids: [maliciousPid],
    }

    // Fake win32 platform for this test
    const originalPlatform = process.platform
    Object.defineProperty(process, 'platform', {
      value: 'win32',
    })

    // Mock process.kill to not throw
    const originalKill = process.kill
    process.kill = vi.fn()

    await handleProject('stop', {}, config)

    // execFileSync should not be called with the malicious payload because of validation
    expect(execFileSync).not.toHaveBeenCalledWith(
      'taskkill',
      ['/F', '/PID', maliciousPid.toString(), '/T'],
      expect.anything(),
    )

    // Restore platform
    Object.defineProperty(process, 'platform', {
      value: originalPlatform,
    })
    process.kill = originalKill
  })

  it('should prevent command injection via activePids in editor status', async () => {
    // biome-ignore lint/suspicious/noExplicitAny: Required to bypass type system for security injection testing
    const maliciousPid = '1234 /T & echo injected' as any
    const config: GodotConfig = {
      projectPath: '/tmp/project',
      godotPath: '/usr/bin/godot',
      godotVersion: null,
      activePids: [maliciousPid],
    }

    const originalKill = process.kill
    process.kill = vi.fn()

    const resultObj = await handleEditor('status', {}, config)
    const result = JSON.parse(resultObj.content[0].text)

    // The malicious PID should be ignored due to validation
    expect(result.processes).toEqual([])

    process.kill = originalKill
  })
})
