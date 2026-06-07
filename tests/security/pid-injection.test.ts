import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GodotConfig } from '../../src/godot/types.js'
import { handleEditor } from '../../src/tools/composite/editor.js'
import { handleProject } from '../../src/tools/composite/project.js'
import { makeConfig } from '../fixtures.js'

// Need to mock node:child_process properly to avoid breaking promisify(execFile) in headless.ts
vi.mock('node:child_process', async (importOriginal) => {
  // biome-ignore lint/suspicious/noExplicitAny: needed for mocking
  const actual = (await importOriginal()) as any
  return {
    ...actual,
    execFileSync: vi.fn(),
  }
})

import { execFileSync } from 'node:child_process'

describe('PID Injection Security', () => {
  let config: GodotConfig

  beforeEach(() => {
    config = makeConfig({ projectPath: '/tmp/project', godotPath: '/path/to/godot' })
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('handleProject stop action', () => {
    it('should NOT call taskkill or process.kill with non-numeric PIDs', async () => {
      const maliciousPid = '123; calc.exe'
      // biome-ignore lint/suspicious/noExplicitAny: explicitly testing injection
      config.activePids = [maliciousPid as any]

      const processKillSpy = vi.spyOn(process, 'kill').mockImplementation(() => true)
      const originalPlatform = process.platform

      // Test Windows path
      Object.defineProperty(process, 'platform', { value: 'win32', configurable: true })

      await handleProject('stop', {}, config)

      expect(processKillSpy).not.toHaveBeenCalledWith(maliciousPid, expect.anything())
      expect(execFileSync).not.toHaveBeenCalledWith(
        'taskkill',
        expect.arrayContaining([maliciousPid]),
        expect.anything(),
      )

      // Test Unix path
      Object.defineProperty(process, 'platform', { value: 'linux', configurable: true })
      vi.clearAllMocks()
      // biome-ignore lint/suspicious/noExplicitAny: explicitly testing injection
      config.activePids = [maliciousPid as any]

      await handleProject('stop', {}, config)
      expect(processKillSpy).not.toHaveBeenCalledWith(maliciousPid, expect.anything())

      processKillSpy.mockRestore()
      Object.defineProperty(process, 'platform', { value: originalPlatform })
    })

    it('should NOT call taskkill or process.kill with non-integer PIDs', async () => {
      const maliciousPid = 123.456
      // biome-ignore lint/suspicious/noExplicitAny: explicitly testing injection
      config.activePids = [maliciousPid as any]

      const processKillSpy = vi.spyOn(process, 'kill').mockImplementation(() => true)

      await handleProject('stop', {}, config)

      expect(processKillSpy).not.toHaveBeenCalledWith(maliciousPid, expect.anything())
      expect(execFileSync).not.toHaveBeenCalledWith(
        'taskkill',
        expect.arrayContaining([maliciousPid.toString()]),
        expect.anything(),
      )

      processKillSpy.mockRestore()
    })
  })

  describe('handleEditor status action', () => {
    it('should NOT call process.kill with non-numeric PIDs', async () => {
      const maliciousPid = '123; calc.exe'
      // biome-ignore lint/suspicious/noExplicitAny: explicitly testing injection
      config.activePids = [maliciousPid as any]

      const processKillSpy = vi.spyOn(process, 'kill').mockImplementation(() => true)

      await handleEditor('status', {}, config)

      expect(processKillSpy).not.toHaveBeenCalledWith(maliciousPid, expect.anything())

      processKillSpy.mockRestore()
    })
  })
})
