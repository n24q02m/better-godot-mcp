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
  }
})

vi.mock('../../src/tools/helpers/paths.js', async () => {
  const actual = await vi.importActual<typeof paths>('../../src/tools/helpers/paths.js')
  return {
    ...actual,
    pathExists: vi.fn(),
  }
})

describe('Config Validation Security', () => {
  let config: GodotConfig

  beforeEach(() => {
    vi.clearAllMocks()
    config = makeConfig({ godotPath: '/usr/bin/godot', projectPath: '/tmp/proj' })
    vi.mocked(detector.isExecutable).mockReturnValue(true)
    vi.mocked(detector.tryGetVersion).mockReturnValue({
      major: 4,
      minor: 2,
      patch: 0,
      label: 'stable',
      raw: '4.2.stable',
    })
    vi.mocked(detector.isVersionSupported).mockReturnValue(true)
    vi.mocked(paths.pathExists).mockResolvedValue(true)
  })

  it('should reject timeout with non-numeric characters', async () => {
    // CURRENT BEHAVIOR: This might pass because there's no validation for timeout
    await expect(handleConfig('set', { key: 'timeout', value: '5000; rm -rf /' }, config)).rejects.toThrow(
      /Invalid characters or format/,
    )
  })

  it('should reject timeout that is too large', async () => {
    await expect(handleConfig('set', { key: 'timeout', value: '999999999999999' }, config)).rejects.toThrow(
      /Invalid characters or format/,
    )
  })

  it('should reject paths with leading whitespace', async () => {
    await expect(handleConfig('set', { key: 'godot_path', value: ' /usr/bin/godot' }, config)).rejects.toThrow(
      /Invalid characters or format/,
    )
  })

  it('should reject paths with trailing whitespace', async () => {
    await expect(handleConfig('set', { key: 'godot_path', value: '/usr/bin/godot ' }, config)).rejects.toThrow(
      /Invalid characters or format/,
    )
  })

  it('should reject paths with multiple consecutive spaces', async () => {
    await expect(handleConfig('set', { key: 'godot_path', value: '/usr/bin/godot  --editor' }, config)).rejects.toThrow(
      /Invalid characters or format/,
    )
  })
})
