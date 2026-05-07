import { join } from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { detectGodot } from '../../src/godot/detector.js'
import type { GodotConfig } from '../../src/godot/types.js'
import { handleConfig } from '../../src/tools/composite/config.js'
import { GodotMCPError } from '../../src/tools/helpers/errors.js'
import { createTmpProject, makeConfig } from '../fixtures.js'

// Mock detectGodot
vi.mock('../../src/godot/detector.js', () => ({
  detectGodot: vi.fn(),
}))

describe('config - detect_godot and check actions', () => {
  let config: GodotConfig

  beforeEach(() => {
    config = makeConfig()
    vi.clearAllMocks()
  })

  // ==========================================
  // detect_godot
  // ==========================================
  describe('detect_godot', () => {
    it('should return found: true when Godot is detected', async () => {
      // Mock successful detection
      vi.mocked(detectGodot).mockReturnValue({
        path: '/usr/bin/godot',
        version: {
          major: 4,
          minor: 2,
          patch: 1,
          label: 'stable',
          raw: '4.2.1.stable',
        },
        source: 'path',
      })

      const result = await handleConfig('detect_godot', {}, config)
      const data = JSON.parse(result.content[0].text)

      expect(data.found).toBe(true)
      expect(data.path).toBe('/usr/bin/godot')
      expect(data.version.raw).toBe('4.2.1.stable')
      expect(data.source).toBe('path')
    })

    it('should return found: false and suggestions when Godot is NOT detected', async () => {
      // Mock failure detection
      vi.mocked(detectGodot).mockReturnValue(null)

      const result = await handleConfig('detect_godot', {}, config)
      const data = JSON.parse(result.content[0].text)

      expect(data.found).toBe(false)
      expect(data.message).toContain('not found')
      expect(data.suggestions).toBeDefined()
      expect(data.suggestions.length).toBeGreaterThan(0)
    })
  })

  // ==========================================
  // check
  // ==========================================
  describe('check', () => {
    let tmpProject: { projectPath: string; cleanup: () => void }

    beforeEach(() => {
      tmpProject = createTmpProject()
    })

    afterEach(() => {
      tmpProject.cleanup()
    })

    it('should return valid project and found godot', async () => {
      // Mock successful detection
      vi.mocked(detectGodot).mockReturnValue({
        path: '/opt/godot/godot',
        version: {
          major: 4,
          minor: 3,
          patch: 0,
          label: 'stable',
          raw: '4.3.stable',
        },
        source: 'env',
      })

      const result = await handleConfig('check', {}, { ...config, projectPath: tmpProject.projectPath })
      const data = JSON.parse(result.content[0].text)

      expect(data.godot.found).toBe(true)
      expect(data.godot.path).toBe('/opt/godot/godot')
      expect(data.project.path).toBe(tmpProject.projectPath)
      expect(data.project.valid).toBe(true)
    })

    it('should return invalid project and missing godot', async () => {
      // Mock failure detection
      vi.mocked(detectGodot).mockReturnValue(null)

      const invalidPath = join(tmpProject.projectPath, 'nonexistent')
      const result = await handleConfig('check', {}, { ...config, projectPath: invalidPath })
      const data = JSON.parse(result.content[0].text)

      expect(data.godot.found).toBe(false)
      expect(data.project.path).toBe(invalidPath)
      expect(data.project.valid).toBe(false)
    })

    it('should handle null project path', async () => {
      // Mock failure detection
      vi.mocked(detectGodot).mockReturnValue(null)

      const result = await handleConfig('check', {}, config)
      const data = JSON.parse(result.content[0].text)

      expect(data.project.path).toBeNull()
    })
  })

  // ==========================================
  // invalid action
  // ==========================================
  it('should throw for unknown action', async () => {
    await expect(handleConfig('invalid_action', {}, config)).rejects.toThrow(GodotMCPError)
    await expect(handleConfig('invalid_action', {}, config)).rejects.toThrow('Unknown action')
  })
})
