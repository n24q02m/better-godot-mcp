/**
 * Integration tests for Config tool
 */

import { beforeEach, describe, expect, it } from 'vitest'
import type { GodotConfig } from '../../src/godot/types.js'
import { handleConfig } from '../../src/tools/composite/config.js'
import { makeConfig } from '../fixtures.js'

describe('config', () => {
  let config: GodotConfig

  beforeEach(() => {
    config = makeConfig({ godotPath: '/usr/bin/godot', projectPath: '/tmp/proj' })
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
    it('should update project_path in config and return success', async () => {
      const result = await handleConfig('set', { key: 'project_path', value: '/new/project' }, config)

      expect(result.content[0].text).toContain('Config updated')
      expect(result.content[0].text).toContain('project_path')
      expect(config.projectPath).toBe('/new/project')
    })

    it('should update godot_path in config and return success', async () => {
      const result = await handleConfig('set', { key: 'godot_path', value: '/usr/local/bin/godot4' }, config)

      expect(result.content[0].text).toContain('Config updated')
      expect(config.godotPath).toBe('/usr/local/bin/godot4')
    })

    it('should store timeout in runtimeConfig and succeed', async () => {
      const result = await handleConfig('set', { key: 'timeout', value: '5000' }, config)

      expect(result.content[0].text).toContain('Config updated')
      expect(result.content[0].text).toContain('timeout')
    })

    it('should reflect set value in subsequent status call', async () => {
      await handleConfig('set', { key: 'project_path', value: '/reflected/path' }, config)
      expect(config.projectPath).toBe('/reflected/path')
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

    it('should reject paths with backtick injection', async () => {
      await expect(handleConfig('set', { key: 'godot_path', value: '/usr/bin/`whoami`' }, config)).rejects.toThrow(
        'Invalid characters',
      )
    })

    it('should reject paths with command substitution', async () => {
      await expect(handleConfig('set', { key: 'godot_path', value: '/usr/bin/$(whoami)' }, config)).rejects.toThrow(
        'Invalid characters',
      )
    })

    it('should reject paths with quotes', async () => {
      await expect(handleConfig('set', { key: 'godot_path', value: '/usr/bin/"malicious"' }, config)).rejects.toThrow(
        'Invalid characters',
      )
    })

    it('should reject paths with redirection', async () => {
      await expect(
        handleConfig('set', { key: 'godot_path', value: '/usr/bin/godot > /tmp/out' }, config),
      ).rejects.toThrow('Invalid characters')
    })

    it('should reject paths with backslash escape sequences', async () => {
      await expect(
        handleConfig('set', { key: 'godot_path', value: '/usr/bin/godot\\n--script' }, config),
      ).rejects.toThrow('Invalid characters')
    })

    it('should reject paths with newlines', async () => {
      await expect(
        handleConfig('set', { key: 'godot_path', value: '/usr/bin/godot\nrm -rf /' }, config),
      ).rejects.toThrow('Invalid characters')
    })

    it('should reject paths that are not strings (e.g. arrays to bypass regex)', async () => {
      await expect(
        handleConfig('set', { key: 'godot_path', value: ['node', '-e', 'pwned'] as unknown as string }, config),
      ).rejects.toThrow('Invalid characters')
    })

    it('should allow timeout with numeric value (no path validation)', async () => {
      const result = await handleConfig('set', { key: 'timeout', value: '30000' }, config)
      expect(result.content[0].text).toContain('Config updated')
    })
  })

  // ==========================================
  // errors
  // ==========================================
  it('should throw for unknown action', async () => {
    await expect(handleConfig('unknown', {}, config)).rejects.toThrow('Unknown action')
  })
})
