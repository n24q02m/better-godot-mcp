/**
 * Tests for CLI subcommands (detect, doctor)
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type * as detectorModule from '../src/godot/detector.js'
import type * as pathsModule from '../src/tools/helpers/paths.js'

vi.mock('../src/godot/detector.js', async () => {
  const actual = await vi.importActual<typeof detectorModule>('../src/godot/detector.js')
  return {
    ...actual,
    detectGodot: vi.fn(),
  }
})

vi.mock('../src/tools/helpers/paths.js', async () => {
  const actual = await vi.importActual<typeof pathsModule>('../src/tools/helpers/paths.js')
  return {
    ...actual,
    pathExists: vi.fn(),
  }
})

import * as detector from '../src/godot/detector.js'
import { runGodotCli } from '../src/godot-cli.js'
import * as paths from '../src/tools/helpers/paths.js'

const FOUND = {
  path: '/usr/bin/godot',
  version: { major: 4, minor: 3, patch: 0, label: 'stable', raw: 'Godot Engine v4.3.stable.official' },
  source: 'path' as const,
}

describe('godot-cli', () => {
  let logSpy: ReturnType<typeof vi.spyOn>
  let errorSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    vi.clearAllMocks()
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
    errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('detect', () => {
    it('prints found JSON and returns 0 when Godot is detected', async () => {
      vi.mocked(detector.detectGodot).mockReturnValue(FOUND)

      const rc = await runGodotCli('detect')

      expect(rc).toBe(0)
      const printed = JSON.parse(logSpy.mock.calls[0][0] as string)
      expect(printed).toEqual({ found: true, path: FOUND.path, version: FOUND.version, source: FOUND.source })
      expect(errorSpy).not.toHaveBeenCalled()
    })

    it('prints not-found JSON, hints GODOT_PATH on stderr, and returns 1 when not detected', async () => {
      vi.mocked(detector.detectGodot).mockReturnValue(null)

      const rc = await runGodotCli('detect')

      expect(rc).toBe(1)
      const printed = JSON.parse(logSpy.mock.calls[0][0] as string)
      expect(printed).toEqual({ found: false, path: null, version: null, source: null })
      expect(errorSpy).toHaveBeenCalledWith(expect.stringContaining('GODOT_PATH'))
    })
  })

  describe('doctor', () => {
    it('reports [ok] for godot and project, returns 0 when both are found', async () => {
      vi.mocked(detector.detectGodot).mockReturnValue(FOUND)
      vi.mocked(paths.pathExists).mockResolvedValue(true)

      const rc = await runGodotCli('doctor')

      expect(rc).toBe(0)
      const lines = logSpy.mock.calls.map((c) => c[0] as string)
      expect(lines.some((l) => l.startsWith('[ok]') && l.includes('godot binary'))).toBe(true)
      expect(lines.some((l) => l.startsWith('[ok]') && l.includes('godot version'))).toBe(true)
      expect(lines.some((l) => l.startsWith('[ok]') && l.includes('project'))).toBe(true)
    })

    it('reports [warn] for a missing project but still returns 0 when Godot is found', async () => {
      vi.mocked(detector.detectGodot).mockReturnValue(FOUND)
      vi.mocked(paths.pathExists).mockResolvedValue(false)

      const rc = await runGodotCli('doctor')

      expect(rc).toBe(0)
      const lines = logSpy.mock.calls.map((c) => c[0] as string)
      expect(lines.some((l) => l.startsWith('[warn]') && l.includes('project'))).toBe(true)
    })

    it('reports [fail] for godot and returns 1 when Godot is not detected', async () => {
      vi.mocked(detector.detectGodot).mockReturnValue(null)
      vi.mocked(paths.pathExists).mockResolvedValue(false)

      const rc = await runGodotCli('doctor')

      expect(rc).toBe(1)
      const lines = logSpy.mock.calls.map((c) => c[0] as string)
      expect(lines.some((l) => l.startsWith('[fail]') && l.includes('godot binary'))).toBe(true)
      expect(lines.some((l) => l.startsWith('[fail]') && l.includes('godot version'))).toBe(true)
    })
  })
})
