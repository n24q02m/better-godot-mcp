import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { handleConfig } from '../../src/tools/composite/config.js'
import { handleProject } from '../../src/tools/composite/project.js'
import { makeConfig } from '../fixtures.js'

describe('Argument Injection Security', () => {
  let config = makeConfig({ projectPath: '/tmp/project', godotPath: '/path/to/godot' })

  beforeEach(() => {
    config = makeConfig({ projectPath: '/tmp/project', godotPath: '/path/to/godot' })
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  describe('handleConfig set action', () => {
    it('should reject paths padded with whitespace followed by a hyphen', async () => {
      await expect(handleConfig('set', { key: 'project_path', value: '   -malicious-flag' }, config)).rejects.toThrow(
        /Invalid characters or format/,
      )

      await expect(handleConfig('set', { key: 'godot_path', value: '\t-malicious-flag' }, config)).rejects.toThrow(
        /Invalid characters or format/,
      )
    })
  })

  describe('handleProject info action', () => {
    it('should reject project paths padded with whitespace followed by a hyphen', async () => {
      await expect(handleProject('info', { project_path: '   -malicious-flag' }, config)).rejects.toThrow(
        /Invalid project path/,
      )
    })
  })

  describe('handleProject run action', () => {
    it('should reject scene paths padded with whitespace followed by a hyphen', async () => {
      await expect(handleProject('run', { scene_path: '   -malicious-flag' }, config)).rejects.toThrow(
        /Invalid scene path/,
      )
    })
  })
})
