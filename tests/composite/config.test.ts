/**
 * Integration tests for Config tool
 */

import * as childProcess from 'node:child_process'
import * as fsModule from 'node:fs'
import * as pathModule from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { GodotConfig } from '../../src/godot/types.js'
import { handleConfig } from '../../src/tools/composite/config.js'
import { makeConfig } from '../fixtures.js'

vi.mock('node:child_process')
vi.mock('node:fs')
vi.mock('node:path')

describe('config', () => {
  let config: GodotConfig

  beforeEach(() => {
    config = makeConfig({ godotPath: '/usr/bin/godot', projectPath: '/tmp/proj' })
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.resetAllMocks()
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
    beforeEach(() => {
      // Setup default successful mocks
      vi.mocked(fsModule.existsSync).mockReturnValue(true)
      vi.mocked(childProcess.execFileSync).mockReturnValue('Godot Engine v4.4.stable.official')
      vi.mocked(pathModule.join).mockImplementation((...args) => args.join('/'))
    })

    it('should update project_path in config and return success', async () => {
      const result = await handleConfig('set', { key: 'project_path', value: '/new/project' }, config)

      expect(result.content[0].text).toContain('Config updated')
      expect(result.content[0].text).toContain('project_path')
      expect(config.projectPath).toBe('/new/project')
    })

    it('should throw if project directory does not exist', async () => {
      vi.mocked(fsModule.existsSync).mockImplementation((p) => p !== '/bad/project')

      await expect(handleConfig('set', { key: 'project_path', value: '/bad/project' }, config)).rejects.toThrow(
        'Invalid project path',
      )
    })

    it('should throw if project.godot does not exist in directory', async () => {
      vi.mocked(fsModule.existsSync).mockImplementation((p) => !String(p).includes('project.godot'))

      await expect(handleConfig('set', { key: 'project_path', value: '/no/godot/file' }, config)).rejects.toThrow(
        'Invalid project path',
      )
    })

    it('should update godot_path in config and return success', async () => {
      const result = await handleConfig('set', { key: 'godot_path', value: '/usr/local/bin/godot4' }, config)

      expect(result.content[0].text).toContain('Config updated')
      expect(config.godotPath).toBe('/usr/local/bin/godot4')
    })

    it('should throw if godot_path does not exist', async () => {
      vi.mocked(fsModule.existsSync).mockReturnValue(false)

      await expect(handleConfig('set', { key: 'godot_path', value: '/bad/godot' }, config)).rejects.toThrow(
        'Invalid Godot path',
      )
    })

    it('should throw if godot_path is not a valid godot executable (command injection attempt)', async () => {
      vi.mocked(childProcess.execFileSync).mockReturnValue("sh: 0: can't access tty; job control turned off")

      await expect(handleConfig('set', { key: 'godot_path', value: '/bin/sh' }, config)).rejects.toThrow(
        'Invalid Godot path',
      )
    })

    it('should throw if godot_path exec fails (e.g. permission denied or execution error)', async () => {
      vi.mocked(childProcess.execFileSync).mockImplementation(() => {
        throw new Error('EACCES')
      })

      await expect(handleConfig('set', { key: 'godot_path', value: '/etc/passwd' }, config)).rejects.toThrow(
        'Invalid Godot path',
      )
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
  })

  // ==========================================
  // errors
  // ==========================================
  it('should throw for unknown action', async () => {
    await expect(handleConfig('unknown', {}, config)).rejects.toThrow('Unknown action')
  })
})
