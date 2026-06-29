import { beforeEach, describe, expect, it, vi } from 'vitest'
import { execGodotAsync, execGodotSync, launchGodotEditor, runGodotProject } from '../../src/godot/headless.js'

vi.mock('node:child_process', () => ({
  spawn: vi.fn(),
  execFile: vi.fn(),
  spawnSync: vi.fn(),
}))

describe('headless.ts security', () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  describe('runGodotProject', () => {
    it('should reject godotPath starting with hyphen', () => {
      expect(() => runGodotProject('--flag', '/tmp/project')).toThrow(/Invalid godotPath/)
    })

    it('should reject projectPath starting with hyphen', () => {
      expect(() => runGodotProject('godot', '--invalid')).toThrow(/Invalid projectPath/)
    })

    it('should reject scenePath starting with hyphen', () => {
      expect(() => runGodotProject('godot', '/tmp/project', '--flag')).toThrow(/Invalid scenePath/)
    })
  })

  describe('launchGodotEditor', () => {
    it('should reject godotPath starting with hyphen', () => {
      expect(() => launchGodotEditor('--flag', '/tmp/project')).toThrow(/Invalid godotPath/)
    })

    it('should reject projectPath starting with hyphen', () => {
      expect(() => launchGodotEditor('godot', '--invalid')).toThrow(/Invalid projectPath/)
    })
  })

  describe('execGodotSync', () => {
    it('should reject godotPath starting with hyphen', () => {
      expect(() => execGodotSync('--flag', [])).toThrow(/Invalid godotPath/)
    })
  })

  describe('execGodotAsync', () => {
    it('should reject godotPath starting with hyphen', async () => {
      await expect(execGodotAsync('--flag', [])).rejects.toThrow(/Invalid godotPath/)
    })
  })
})
