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
    vi.mocked(detector.isExecutable).mockResolvedValue(true)
    vi.mocked(detector.tryGetVersion).mockResolvedValue({
      major: 4,
      minor: 2,
      patch: 0,
      label: 'stable',
      raw: 'Godot Engine v4.2.stable.official',
    })
    vi.mocked(detector.isVersionSupported).mockReturnValue(true)
    vi.mocked(paths.pathExists).mockResolvedValue(true)
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

    it('should show not detected when godotPath is null', async () => {
      config = makeConfig({ projectPath: '/tmp/proj' })
      const result = await handleConfig('status', {}, config)
      const data = JSON.parse(result.content[0].text)

      expect(data.godot_path).toBe('not detected')
    })

    it('should show not set when projectPath is null', async () => {
      config = makeConfig()
      const result = await handleConfig('status', {}, config)
      const data = JSON.parse(result.content[0].text)

      expect(data.project_path).toBe('not set')
    })

    it('should show godot_path from config', async () => {
      config = makeConfig({ godotPath: '/custom/godot' })
      const result = await handleConfig('status', {}, config)
      const data = JSON.parse(result.content[0].text)

      expect(data.godot_path).toBe('/custom/godot')
    })

    it('should show runtime_overrides as an object', async () => {
      const result = await handleConfig('status', {}, config)
      const data = JSON.parse(result.content[0].text)

      expect(typeof data.runtime_overrides).toBe('object')
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
      expect(result.content[0].text).toContain('project_path')
      expect(config.projectPath).toBe('/new/project')
    })

    it('should throw when project_path does not contain project.godot', async () => {
      vi.mocked(paths.pathExists).mockResolvedValue(false)
      await expect(handleConfig('set', { key: 'project_path', value: '/invalid/project' }, config)).rejects.toThrow(
        'Invalid project path',
      )
    })

    it('should update godot_path in config and return success when valid', async () => {
      vi.mocked(detector.isExecutable).mockResolvedValue(true)
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
      expect(config.godotVersion?.raw).toBe('4.2.stable')
    })

    it('should throw when godot_path is not executable', async () => {
      vi.mocked(detector.isExecutable).mockResolvedValue(false)
      await expect(handleConfig('set', { key: 'godot_path', value: '/tmp/not-exe' }, config)).rejects.toThrow(
        'Invalid Godot path',
      )
    })

    it('should throw when godot_path is not a valid Godot binary', async () => {
      vi.mocked(detector.isExecutable).mockResolvedValue(true)
      vi.mocked(detector.tryGetVersion).mockResolvedValue(null)
      await expect(handleConfig('set', { key: 'godot_path', value: '/tmp/fake-godot' }, config)).rejects.toThrow(
        'Invalid Godot binary',
      )
    })

    it('should throw when Godot version is unsupported', async () => {
      vi.mocked(detector.isExecutable).mockResolvedValue(true)
      vi.mocked(detector.tryGetVersion).mockResolvedValue({
        major: 3,
        minor: 5,
        patch: 0,
        label: 'stable',
        raw: '3.5.stable',
      })
      vi.mocked(detector.isVersionSupported).mockReturnValue(false)
      await expect(handleConfig('set', { key: 'godot_path', value: '/usr/bin/godot3' }, config)).rejects.toThrow(
        'Unsupported Godot version',
      )
    })

    it('should store timeout in runtimeConfig and succeed', async () => {
      const result = await handleConfig('set', { key: 'timeout', value: '5000' }, config)

      expect(result.content[0].text).toContain('Config updated')
      expect(result.content[0].text).toContain('timeout')
    })

    it('should throw for invalid key', async () => {
      await expect(handleConfig('set', { key: 'foo', value: 'bar' }, config)).rejects.toThrow('Invalid config key')
    })

    it('should throw when key is missing', async () => {
      await expect(handleConfig('set', { value: 'bar' }, config)).rejects.toThrow('No key specified')
    })

    it('should throw when value is undefined', async () => {
      await expect(handleConfig('set', { key: 'project_path' }, config)).rejects.toThrow('No value specified')
    })

    it('should reject project_path with shell metacharacters', async () => {
      await expect(handleConfig('set', { key: 'project_path', value: '/tmp/proj; rm -rf /' }, config)).rejects.toThrow(
        'Invalid characters',
      )
    })

    it('should reject godot_path with shell metacharacters', async () => {
      await expect(handleConfig('set', { key: 'godot_path', value: '/usr/bin/godot && evil' }, config)).rejects.toThrow(
        'Invalid characters',
      )
    })

    it('should allow Windows-style paths with backslashes (if valid)', async () => {
      vi.mocked(detector.isExecutable).mockResolvedValue(true)
      const result = await handleConfig(
        'set',
        { key: 'godot_path', value: 'C:\\Program Files\\Godot\\godot.exe' },
        config,
      )
      expect(result.content[0].text).toContain('Config updated')
    })

    it('should reject paths with newlines', async () => {
      await expect(
        handleConfig('set', { key: 'godot_path', value: '/usr/bin/godot\nrm -rf /' }, config),
      ).rejects.toThrow('Invalid characters')
    })

    it('should reject paths starting with a hyphen', async () => {
      await expect(handleConfig('set', { key: 'godot_path', value: '--some-flag' }, config)).rejects.toThrow(
        'Invalid characters or format',
      )
      await expect(handleConfig('set', { key: 'project_path', value: '-evil' }, config)).rejects.toThrow(
        'Invalid characters or format',
      )
    })

    it('should reject paths that are not strings', async () => {
      await expect(
        handleConfig('set', { key: 'godot_path', value: ['node', '-e', 'pwned'] as unknown as string }, config),
      ).rejects.toThrow('Invalid characters')
    })
  })

  // ==========================================
  // setup_* parity actions (no-op stubs — godot has no credentials)
  // ==========================================
  describe('setup_status', () => {
    it('should return needs_setup: false', async () => {
      const result = await handleConfig('setup_status', {}, config)
      const data = JSON.parse(result.content[0].text)

      expect(data.needs_setup).toBe(false)
      expect(typeof data.reason).toBe('string')
    })
  })

  describe('setup_start', () => {
    it('should return no-setup-needed stub', async () => {
      const result = await handleConfig('setup_start', {}, config)

      expect(result.content[0].text).toContain('No setup required')
    })
  })

  describe('setup_reset', () => {
    it('should return nothing-to-reset stub', async () => {
      const result = await handleConfig('setup_reset', {}, config)

      expect(result.content[0].text).toContain('Nothing to reset')
    })
  })

  describe('setup_complete', () => {
    it('should return already-complete stub', async () => {
      const result = await handleConfig('setup_complete', {}, config)

      expect(result.content[0].text).toContain('Already complete')
    })
  })

  describe('setup_skip', () => {
    it('should return nothing-to-skip stub', async () => {
      const result = await handleConfig('setup_skip', {}, config)

      expect(result.content[0].text).toContain('Nothing to skip')
    })
  })

  // ==========================================
  // errors
  // ==========================================
  it('should throw for unknown action', async () => {
    await expect(handleConfig('unknown', {}, config)).rejects.toThrow('Unknown action')
  })
})
