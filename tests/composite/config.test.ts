import { beforeEach, describe, expect, it, vi } from 'vitest'
import * as detector from '../../src/godot/detector.js'
import type { GodotConfig } from '../../src/godot/types.js'
import { handleConfig } from '../../src/tools/composite/config.js'
import * as paths from '../../src/tools/helpers/paths.js'
import { makeConfig } from '../fixtures.js'

vi.mock('../../src/godot/detector.js', async () => {
  const actual = await vi.importActual<typeof detector>('../../src/godot/detector.js')
  return {
    ...actual,
    isExecutable: vi.fn(),
    tryGetVersion: vi.fn(),
    isVersionSupported: vi.fn(),
    detectGodot: vi.fn(),
  }
})

vi.mock('../../src/tools/helpers/paths.js', async () => {
  const actual = await vi.importActual<typeof paths>('../../src/tools/helpers/paths.js')
  return {
    ...actual,
    pathExists: vi.fn(),
  }
})

describe('config', () => {
  let config: GodotConfig

  beforeEach(() => {
    vi.clearAllMocks()
    config = makeConfig({ godotPath: '/usr/bin/godot', projectPath: '/tmp/proj' })

    // Default mocks to pass initial validations if needed
    vi.mocked(detector.isExecutable).mockReturnValue(true)
    vi.mocked(detector.tryGetVersion).mockResolvedValue({
      major: 4,
      minor: 2,
      patch: 0,
      label: 'stable',
      raw: 'Godot Engine v4.2.stable.official',
    })
    vi.mocked(detector.isVersionSupported).mockReturnValue(true)
    vi.mocked(paths.pathExists).mockResolvedValue(true)
    vi.mocked(detector.detectGodot).mockResolvedValue({
      path: '/usr/bin/godot',
      version: { major: 4, minor: 2, patch: 0, label: 'stable', raw: '4.2.stable' },
      source: 'path',
    })
  })

  // ==========================================
  // status
  // ==========================================
  describe('status', () => {
    it('should return JSON with required fields', async () => {
      const result = await handleConfig('status', {}, config)
      const data = JSON.parse(result.content[0].text)

      expect(data).toHaveProperty('godot_path')
      expect(data).toHaveProperty('godot_version')
      expect(data).toHaveProperty('project_path')
      expect(data).toHaveProperty('runtime_overrides')
    })
  })

  // ==========================================
  // set
  // ==========================================
  describe('set', () => {
    it('should update project_path in config and return success when valid', async () => {
      vi.mocked(paths.pathExists).mockResolvedValue(true)
      const result = await handleConfig('set', { key: 'project_path', value: '/new/project' }, config)

      expect(result.content[0].text).toContain('Config updated')
      expect(config.projectPath).toBe('/new/project')
    })

    it('should update godot_path in config and return success when valid', async () => {
      vi.mocked(detector.isExecutable).mockReturnValue(true)
      vi.mocked(detector.tryGetVersion).mockResolvedValue({
        major: 4,
        minor: 2,
        patch: 0,
        label: 'stable',
        raw: '4.2.stable',
      })
      vi.mocked(detector.isVersionSupported).mockReturnValue(true)

      const result = await handleConfig('set', { key: 'godot_path', value: '/usr/local/bin/godot4' }, config)

      expect(result.content[0].text).toContain('Config updated')
      expect(config.godotPath).toBe('/usr/local/bin/godot4')
    })

    it('should throw when godot_path is not a valid Godot binary', async () => {
      vi.mocked(detector.isExecutable).mockReturnValue(true)
      vi.mocked(detector.tryGetVersion).mockResolvedValue(null)
      await expect(handleConfig('set', { key: 'godot_path', value: '/tmp/fake-godot' }, config)).rejects.toThrow(
        'Invalid Godot binary',
      )
    })
  })

  // ==========================================
  // detect_godot
  // ==========================================
  describe('detect_godot', () => {
    it('should return success when found', async () => {
      const result = await handleConfig('detect_godot', {}, config)
      const data = JSON.parse(result.content[0].text)
      expect(data.found).toBe(true)
      expect(data.path).toBe('/usr/bin/godot')
    })

    it('should return failure when not found', async () => {
      vi.mocked(detector.detectGodot).mockResolvedValue(null)
      const result = await handleConfig('detect_godot', {}, config)
      const data = JSON.parse(result.content[0].text)
      expect(data.found).toBe(false)
    })
  })

  // ==========================================
  // check
  // ==========================================
  describe('check', () => {
    it('should return status of godot and project', async () => {
      const result = await handleConfig('check', {}, config)
      const data = JSON.parse(result.content[0].text)
      expect(data).toHaveProperty('godot')
      expect(data).toHaveProperty('project')
    })
  })
})
