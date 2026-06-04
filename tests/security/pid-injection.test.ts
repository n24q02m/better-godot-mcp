import { execFileSync } from 'node:child_process'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { GodotConfig } from '../../src/godot/types.js'
import { handleEditor } from '../../src/tools/composite/editor.js'
import { handleProject } from '../../src/tools/composite/project.js'

vi.mock('node:child_process', () => ({
  execFileSync: vi.fn(),
}))

vi.mock('../../src/godot/headless.js', () => ({
  runGodotProject: vi.fn(),
  launchGodotEditor: vi.fn(),
  execGodotAsync: vi.fn(),
}))

describe('PID Injection Security', () => {
  let config: GodotConfig

  beforeEach(() => {
    vi.clearAllMocks()
    config = {
      godotPath: '/path/to/godot',
      godotVersion: { major: 4, minor: 0, patch: 0, label: 'stable', raw: '4.0.stable' },
      projectPath: '/path/to/project',
      activePids: [],
    }
  })

  describe('handleProject stop', () => {
    it('should only call taskkill with valid integer PIDs on Windows', async () => {
      const originalPlatform = process.platform
      Object.defineProperty(process, 'platform', { value: 'win32', configurable: true })

      // Inject a malicious "PID" (bypassing type system)
      // biome-ignore lint/suspicious/noExplicitAny: needed for testing security bypass
      ;(config.activePids as any).push('1234; calc.exe')

      const processKillSpy = vi.spyOn(process, 'kill').mockImplementation(() => {
        return true
      })

      await handleProject('stop', {}, config)

      // Check if taskkill was called with the malicious string
      expect(execFileSync).not.toHaveBeenCalledWith(
        'taskkill',
        expect.arrayContaining(['1234; calc.exe']),
        expect.anything(),
      )

      processKillSpy.mockRestore()
      Object.defineProperty(process, 'platform', { value: originalPlatform })
    })

    it('should skip non-numeric PIDs', async () => {
      // biome-ignore lint/suspicious/noExplicitAny: needed for testing security bypass
      ;(config.activePids as any).push('not-a-pid')
      const processKillSpy = vi.spyOn(process, 'kill')

      await handleProject('stop', {}, config)

      expect(processKillSpy).not.toHaveBeenCalled()
      processKillSpy.mockRestore()
    })
  })

  describe('handleEditor status', () => {
    it('should skip invalid PIDs in getGodotProcesses', async () => {
      // biome-ignore lint/suspicious/noExplicitAny: needed for testing security bypass
      ;(config.activePids as any).push('1234; calc.exe')
      const processKillSpy = vi.spyOn(process, 'kill')

      const result = await handleEditor('status', {}, config)
      const data = JSON.parse(result.content[0].text)

      expect(processKillSpy).not.toHaveBeenCalledWith('1234; calc.exe', 0)
      expect(data.processes).toHaveLength(0)

      processKillSpy.mockRestore()
    })
  })
})
